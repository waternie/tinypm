"""智能助理服务。"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.config import settings
from app.models.agent import AgentMessage, AgentSession, AgentSetting
from app.models.project import Project
from app.models.user import User
from app.schemas.agent import AgentChatRequest, AgentToolCallSummary
from app.services import project_mcp


logger = logging.getLogger(__name__)

DEFAULT_SESSION_TITLE = "新对话"
MODEL_REQUEST_MAX_ATTEMPTS = 3
MODEL_REQUEST_RETRY_BASE_SECONDS = 1.0
DEFAULT_SYSTEM_PROMPT = """
你是一位资深的车载电子项目经理（PM），专注 OTA（Over-The-Air）升级与远程诊断领域，具备 10 年以上汽车电子行业经验。

**专业背景：**
- 精通 Classic AUTOSAR / Adaptive AUTOSAR 架构下的 OTA 系统设计
- 熟悉 UDS（ISO 14229）、DoIP（ISO 13400）、CAN/CANFD、以太网诊断通信
- 了解功能安全（ISO 26262 ASIL 等级）与网络安全（ISO/SAE 21434、WP.29 R155/R156）
- 具备 OEM 量产项目交付经验，熟悉 V-model 开发流程与 ASPICE 标准

**核心职责：**
1. 对内：对齐硬件（HW）、基础软件（BSW）、应用层（ASW）、测试（QA）、法规（Homologation）进度
2. 对外：对接 OEM 客户、Tier-1 供应商、云平台服务商、测试认证机构
3. 风险管控：识别技术风险（刷写失败、变砖）、法规风险（型式认证）、供应链风险（芯片短缺）
4. 文档交付：项目计划、FMEA、安全案例、测试报告、OTA 释放说明（Release Notes）

**技术理解要求：**
- 能解析 OTA 架构：T-Box / IVI 作为 Master，各 ECU（发动机、变速箱、ADAS）作为 Slave
- 理解刷写策略：全量 vs 差分升级、A/B 分区（无缝切换）、Pflash/RAM 刷写流程
- 熟悉诊断流程：预编程（Pre-programming）、主编程（Main programming）、后编程（Post-programming）
- 了解回滚（Rollback）机制与故障安全（Fail-safe）策略
""".strip()

AGENT_RUNTIME_PROMPT = """
你是 TinyPM 的项目管理智能助理。你只能通过项目数据 MCP 工具读取或修改项目数据。
当用户询问项目、计划、需求或问题时，先调用 MCP 工具获取真实数据，再基于工具结果回答。
当用户要求审核“当前计划”且提供了 plan_id 时，只调用 get_project_plan 获取该单条计划，不要把 list_project_plans 的全量结果当作审核对象。
当用户要求新增或更新计划时，必须调用对应 MCP 工具；没有权限或参数不足时，清楚说明需要补充的信息。
回答使用简体中文，保持简洁、具体、可执行。
""".strip()

DEESEEK_MODEL_ALIASES = {
    "deepseek-v4-flash": "deepseek-v4-flash",
    "deepseek-v4-pro": "deepseek-v4-pro",
}

AGENT_SKILLS: dict[str, dict[str, Any]] = {
    "general": {
        "name": "通用项目助理",
        "description": "适合日常项目问答、数据查询和常规更新。",
        "system_prompt": "优先给出明确结论和下一步动作，避免空泛说明。",
    },
    "planner": {
        "name": "计划排程",
        "description": "关注计划排期、依赖关系、工期调整和任务拆解。",
        "system_prompt": "当用户描述时间调整或排期变更时，优先定位具体计划记录，并明确开始、结束、工期之间的关系。",
    },
    "reviewer": {
        "name": "审核专员",
        "description": "关注字段完整性、进度异常和交付前检查。",
        "system_prompt": "审核时先验证关键字段完整性，再指出风险等级和建议动作。",
    },
    "editor": {
        "name": "数据维护",
        "description": "适合通过 MCP 回写项目数据，减少人工录入。",
        "system_prompt": "当用户要修改项目计划或项目字段时，先确认目标记录，再直接调用 MCP 工具完成更新。",
    },
}


def _normalize_model_name(model: str | None) -> str:
    """归一化模型名称，兼容旧配置中的大小写写法。"""
    value = (model or "").strip()
    if not value:
        return settings.AGENT_DEFAULT_MODEL
    normalized = DEESEEK_MODEL_ALIASES.get(value.lower())
    return normalized or value


def _normalize_skill_id(skill_id: str | None) -> str:
    """归一化技能ID。"""
    value = (skill_id or "").strip().lower()
    if value in AGENT_SKILLS:
        return value
    return "general"


def list_skills() -> list[dict[str, Any]]:
    """返回技能目录。"""
    return [
        {
            "id": skill_id,
            "name": item["name"],
            "description": item["description"],
        }
        for skill_id, item in AGENT_SKILLS.items()
    ]


def get_or_create_setting(db: Session, user: User) -> AgentSetting:
    """获取或创建用户智能助理配置。"""
    setting = db.query(AgentSetting).filter(AgentSetting.user_id == user.id).first()
    if setting is not None:
        normalized_model = _normalize_model_name(setting.model)
        if setting.model != normalized_model:
            setting.model = normalized_model
            db.commit()
            db.refresh(setting)
        return setting

    setting = AgentSetting(
        user_id=user.id,
        model=_normalize_model_name(settings.AGENT_DEFAULT_MODEL),
        api_key=None,
        api_base_url=settings.AGENT_DEFAULT_API_BASE_URL,
    )
    db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting


def update_setting(
    db: Session,
    user: User,
    update_data: dict[str, Any],
) -> AgentSetting:
    """更新用户智能助理配置。"""
    setting = get_or_create_setting(db, user)
    if "model" in update_data and update_data["model"]:
        setting.model = _normalize_model_name(update_data["model"])
    if "api_base_url" in update_data and update_data["api_base_url"]:
        setting.api_base_url = update_data["api_base_url"].strip().rstrip("/")
    if "api_key" in update_data:
        api_key = update_data["api_key"]
        setting.api_key = api_key.strip() if api_key else None

    db.commit()
    db.refresh(setting)
    return setting


def list_sessions(db: Session, user: User) -> list[AgentSession]:
    """获取当前用户会话列表。"""
    return (
        db.query(AgentSession)
        .filter(AgentSession.user_id == user.id)
        .options(selectinload(AgentSession.messages))
        .order_by(AgentSession.last_message_at.desc(), AgentSession.id.desc())
        .all()
    )


def get_session(db: Session, user: User, session_id: int) -> AgentSession:
    """获取当前用户单个会话。"""
    session = (
        db.query(AgentSession)
        .filter(AgentSession.user_id == user.id, AgentSession.id == session_id)
        .options(selectinload(AgentSession.messages))
        .first()
    )
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="会话不存在")
    return session


def create_session(
    db: Session,
    user: User,
    project_id: int | None = None,
    title: str | None = None,
    skill_id: str | None = None,
    system_prompt: str | None = None,
) -> AgentSession:
    """创建新会话。"""
    normalized_project_id = _validate_project_id(db, project_id)
    session = AgentSession(
        user_id=user.id,
        project_id=normalized_project_id,
        title=(title or DEFAULT_SESSION_TITLE).strip() or DEFAULT_SESSION_TITLE,
        skill_id=_normalize_skill_id(skill_id),
        system_prompt=(system_prompt or DEFAULT_SYSTEM_PROMPT).strip(),
    )
    db.add(session)
    db.commit()
    return get_session(db, user, session.id)


def update_session(
    db: Session,
    user: User,
    session_id: int,
    update_data: dict[str, Any],
) -> AgentSession:
    """更新会话元数据。"""
    session = get_session(db, user, session_id)
    if "project_id" in update_data:
        session.project_id = _validate_project_id(db, update_data["project_id"])
    if "title" in update_data and update_data["title"]:
        session.title = update_data["title"].strip() or DEFAULT_SESSION_TITLE
    if "skill_id" in update_data and update_data["skill_id"]:
        session.skill_id = _normalize_skill_id(update_data["skill_id"])
    if "system_prompt" in update_data and update_data["system_prompt"]:
        session.system_prompt = update_data["system_prompt"].strip()
    session.updated_at = datetime.now(timezone.utc)
    db.commit()
    return get_session(db, user, session_id)


async def chat_with_agent(
    db: Session,
    user: User,
    request: AgentChatRequest,
) -> tuple[int, str, str, list[AgentToolCallSummary]]:
    """执行智能助理对话。"""
    setting = get_or_create_setting(db, user)
    session = _resolve_chat_session(db, user, request)
    model = _normalize_model_name(request.model or setting.model or settings.AGENT_DEFAULT_MODEL)
    api_base_url = (setting.api_base_url or settings.AGENT_DEFAULT_API_BASE_URL).rstrip("/")
    api_key = request.api_key or setting.api_key
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请先填写 DeepSeek API Key",
        )

    tool_summaries: list[AgentToolCallSummary] = []
    messages = _build_conversation_messages(session, request.message)

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            for _ in range(5):
                response_message = await _request_chat_completion(
                    client,
                    api_base_url=api_base_url,
                    api_key=api_key,
                    model=model,
                    messages=messages,
                )
                tool_calls = response_message.get("tool_calls") or []
                messages.append(response_message)

                if not tool_calls:
                    answer = response_message.get("content") or "已完成处理。"
                    _persist_round(
                        db=db,
                        session=session,
                        user_message=request.message,
                        assistant_message=answer,
                        model=model,
                        tool_summaries=tool_summaries,
                        is_error=False,
                    )
                    return session.id, answer, model, tool_summaries

                for tool_call in tool_calls:
                    tool_result, summary = _execute_tool_call(db, user, tool_call)
                    tool_summaries.append(summary)
                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tool_call.get("id"),
                            "content": json.dumps(tool_result, ensure_ascii=False, default=str),
                        }
                    )
    except HTTPException as exc:
        _persist_round(
            db=db,
            session=session,
            user_message=request.message,
            assistant_message=str(exc.detail),
            model=model,
            tool_summaries=[],
            is_error=True,
        )
        raise

    error_detail = "模型多轮工具调用未收敛，请缩小问题范围后重试"
    _persist_round(
        db=db,
        session=session,
        user_message=request.message,
        assistant_message=error_detail,
        model=model,
        tool_summaries=[],
        is_error=True,
    )
    raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=error_detail)


def _resolve_chat_session(db: Session, user: User, request: AgentChatRequest) -> AgentSession:
    """解析对话对应的会话。"""
    if request.session_id is not None:
        session = get_session(db, user, request.session_id)
        changed = False
        normalized_project_id = _validate_project_id(db, request.project_id)
        normalized_skill_id = _normalize_skill_id(request.skill_id or session.skill_id)
        if request.project_id is not None and session.project_id != normalized_project_id:
            session.project_id = normalized_project_id
            changed = True
        if normalized_skill_id != session.skill_id:
            session.skill_id = normalized_skill_id
            changed = True
        if request.system_prompt and request.system_prompt.strip() != (session.system_prompt or ""):
            session.system_prompt = request.system_prompt.strip()
            changed = True
        if changed:
            session.updated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(session)
        return get_session(db, user, session.id)

    return create_session(
        db=db,
        user=user,
        project_id=request.project_id,
        skill_id=request.skill_id,
        system_prompt=request.system_prompt,
    )


def _build_conversation_messages(session: AgentSession, current_message: str) -> list[dict[str, Any]]:
    """构造模型多轮对话消息。"""
    messages: list[dict[str, Any]] = [
        {
            "role": "system",
            "content": _build_system_prompt(session),
        }
    ]
    for message in session.messages:
        if message.is_error or message.role not in {"user", "assistant"}:
            continue
        messages.append({"role": message.role, "content": message.content})
    messages.append({"role": "user", "content": current_message.strip()})
    return messages


def _build_system_prompt(session: AgentSession) -> str:
    """构造系统提示词。"""
    skill = AGENT_SKILLS[_normalize_skill_id(session.skill_id)]
    lines = [session.system_prompt or DEFAULT_SYSTEM_PROMPT, AGENT_RUNTIME_PROMPT, skill["system_prompt"]]
    if session.project_id is not None:
        lines.append(f"当前会话绑定项目ID：{session.project_id}。如果用户没有明确切换项目，就按这个项目处理。")
    return "\n".join(lines)


async def _request_chat_completion(
    client: httpx.AsyncClient,
    api_base_url: str,
    api_key: str,
    model: str,
    messages: list[dict[str, Any]],
) -> dict[str, Any]:
    """带重试请求 OpenAI 兼容 Chat Completions 接口。"""
    failures: list[str] = []
    for attempt in range(1, MODEL_REQUEST_MAX_ATTEMPTS + 1):
        try:
            return await _request_chat_completion_once(
                client=client,
                api_base_url=api_base_url,
                api_key=api_key,
                model=model,
                messages=messages,
            )
        except HTTPException as exc:
            reason = str(exc.detail)
            failures.append(f"第 {attempt} 次：{reason}")
            logger.warning(
                "大模型请求失败，第 %s/%s 次，model=%s，api_base_url=%s，原因：%s",
                attempt,
                MODEL_REQUEST_MAX_ATTEMPTS,
                model,
                api_base_url,
                reason,
            )
            if not _should_retry_model_error(reason) or attempt >= MODEL_REQUEST_MAX_ATTEMPTS:
                break
            await asyncio.sleep(MODEL_REQUEST_RETRY_BASE_SECONDS * attempt)

    detail = "大模型请求失败"
    if len(failures) > 1:
        detail += f"，已重试 {len(failures)} 次"
    detail += f"。原因：{'; '.join(failures)}"
    logger.error(detail)
    raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)


async def _request_chat_completion_once(
    client: httpx.AsyncClient,
    api_base_url: str,
    api_key: str,
    model: str,
    messages: list[dict[str, Any]],
) -> dict[str, Any]:
    """执行单次 OpenAI 兼容 Chat Completions 请求。"""
    payload = {
        "model": model,
        "messages": messages,
        "tools": project_mcp.list_openai_tools(),
        "tool_choice": "auto",
        "temperature": 0.2,
    }
    try:
        response = await client.post(
            f"{api_base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        detail = _format_model_status_error(exc.response)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=detail,
        ) from exc
    except httpx.HTTPError as exc:
        detail = _format_model_transport_error(exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=detail,
        ) from exc

    try:
        data = response.json()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"大模型响应不是合法 JSON：{response.text[:300]}",
        ) from exc

    choices = data.get("choices") or []
    if not choices:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="大模型响应缺少 choices",
        )
    return choices[0].get("message") or {}


def _execute_tool_call(
    db: Session,
    user: User,
    tool_call: dict[str, Any],
) -> tuple[dict[str, Any], AgentToolCallSummary]:
    """执行模型发起的 MCP 工具调用。"""
    function_data = tool_call.get("function") or {}
    name = function_data.get("name") or ""
    arguments_text = function_data.get("arguments") or "{}"
    try:
        arguments = json.loads(arguments_text)
    except json.JSONDecodeError:
        arguments = {}

    try:
        result = project_mcp.call_tool(db, user, name, arguments)
        summary = AgentToolCallSummary(
            name=name,
            arguments=arguments,
            success=True,
            result_preview=_preview_result(result),
        )
        return result, summary
    except HTTPException as exc:
        result = {"error": exc.detail}
        summary = AgentToolCallSummary(
            name=name,
            arguments=arguments,
            success=False,
            result_preview=str(exc.detail),
        )
        return result, summary


def _persist_round(
    db: Session,
    session: AgentSession,
    user_message: str,
    assistant_message: str,
    model: str,
    tool_summaries: list[AgentToolCallSummary],
    is_error: bool,
) -> None:
    """持久化一轮用户和助理消息。"""
    user_record = AgentMessage(
        session_id=session.id,
        role="user",
        content=user_message.strip(),
        model=None,
        tool_calls_json=None,
        is_error=False,
    )
    assistant_record = AgentMessage(
        session_id=session.id,
        role="assistant",
        content=assistant_message.strip(),
        model=model,
        tool_calls_json=json.dumps(
            [item.model_dump() for item in tool_summaries],
            ensure_ascii=False,
        )
        if tool_summaries
        else None,
        is_error=is_error,
    )
    db.add(user_record)
    db.add(assistant_record)

    if session.title == DEFAULT_SESSION_TITLE and user_message.strip():
        session.title = _build_session_title(user_message)
    session.last_message_at = datetime.now(timezone.utc)
    session.updated_at = datetime.now(timezone.utc)
    db.commit()


def parse_tool_calls(tool_calls_json: str | None) -> list[dict[str, Any]]:
    """解析工具调用摘要。"""
    if not tool_calls_json:
        return []
    try:
        data = json.loads(tool_calls_json)
    except json.JSONDecodeError:
        return []
    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]
    return []


def _build_session_title(user_message: str) -> str:
    """根据首条用户消息生成会话标题。"""
    text = " ".join(user_message.strip().split())
    if not text:
        return DEFAULT_SESSION_TITLE
    if len(text) <= 24:
        return text
    return f"{text[:24]}..."


def _validate_project_id(db: Session, project_id: int | None) -> int | None:
    """校验项目ID是否存在。"""
    if project_id is None:
        return None
    project = db.query(Project.id).filter(Project.id == project_id).first()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")
    return project_id


def _should_retry_model_error(reason: str) -> bool:
    """判断大模型错误是否值得重试。"""
    status_code = _extract_status_code_from_reason(reason)
    if status_code is not None:
        return status_code in {408, 409, 425, 429} or status_code >= 500
    return True


def _extract_status_code_from_reason(reason: str) -> int | None:
    """从错误原因中提取 HTTP 状态码。"""
    if not reason.startswith("HTTP "):
        return None
    status_text = reason.split(":", 1)[0].replace("HTTP ", "", 1).split(" ", 1)[0]
    try:
        return int(status_text)
    except ValueError:
        return None


def _format_model_status_error(response: httpx.Response) -> str:
    """格式化大模型 HTTP 状态错误。"""
    reason_phrase = response.reason_phrase or "Unknown"
    detail = _extract_model_error(response)
    return f"HTTP {response.status_code} {reason_phrase}: {detail}"


def _format_model_transport_error(exc: httpx.HTTPError) -> str:
    """格式化大模型网络传输错误。"""
    message = str(exc).strip() or repr(exc)
    request = getattr(exc, "request", None)
    request_text = ""
    if request is not None:
        request_text = f"，请求：{request.method} {request.url}"
    cause = repr(exc.__cause__) if exc.__cause__ is not None else ""
    cause_text = f"，底层原因：{cause}" if cause else ""
    return f"{exc.__class__.__name__}: {message}{request_text}{cause_text}"


def _extract_model_error(response: httpx.Response) -> str:
    """提取模型错误信息。"""
    try:
        payload = response.json()
    except ValueError:
        text = response.text[:300].strip()
        return text or "响应体为空"
    error = payload.get("error")
    if isinstance(error, dict):
        message = error.get("message") or error
        code = error.get("code")
        error_type = error.get("type")
        extras = []
        if code:
            extras.append(f"code={code}")
        if error_type:
            extras.append(f"type={error_type}")
        suffix = f"（{', '.join(extras)}）" if extras else ""
        return f"{message}{suffix}"[:300]
    text = str(error or payload)[:300].strip()
    return text or "响应体为空"


def _preview_result(result: dict[str, Any]) -> str:
    """生成工具结果预览。"""
    text = json.dumps(result, ensure_ascii=False, default=str)
    if len(text) <= 240:
        return text
    return f"{text[:240]}..."
