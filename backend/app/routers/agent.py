"""智能助理路由。"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.agent import (
    AgentChatRequest,
    AgentChatResponse,
    AgentSessionCreate,
    AgentSessionDetailResponse,
    AgentSessionMessageResponse,
    AgentSessionResponse,
    AgentSessionUpdate,
    AgentSettingResponse,
    AgentSettingUpdate,
    AgentSkillResponse,
    AgentToolCallSummary,
)
from app.services import agent as agent_service

router = APIRouter(prefix="/api/agent", tags=["智能助理"])


def _serialize_session(session) -> AgentSessionResponse:
    """序列化会话摘要。"""
    return AgentSessionResponse(
        id=session.id,
        title=session.title,
        project_id=session.project_id,
        skill_id=session.skill_id,
        system_prompt=session.system_prompt,
        message_count=len(session.messages or []),
        created_at=session.created_at,
        updated_at=session.updated_at,
        last_message_at=session.last_message_at,
    )


def _serialize_session_detail(session) -> AgentSessionDetailResponse:
    """序列化会话详情。"""
    return AgentSessionDetailResponse(
        **_serialize_session(session).model_dump(),
        messages=[
            AgentSessionMessageResponse(
                id=message.id,
                role=message.role,
                content=message.content,
                model=message.model,
                tool_calls=[
                    AgentToolCallSummary.model_validate(item)
                    for item in agent_service.parse_tool_calls(message.tool_calls_json)
                ],
                is_error=message.is_error,
                created_at=message.created_at,
            )
            for message in session.messages
        ],
    )


@router.get("/skills", response_model=list[AgentSkillResponse], summary="获取技能目录")
def list_agent_skills(
    current_user: User = Depends(get_current_user),
) -> list[AgentSkillResponse]:
    """获取内置技能和提示词模板。"""
    del current_user
    return [AgentSkillResponse.model_validate(item) for item in agent_service.list_skills()]


@router.get("/sessions", response_model=list[AgentSessionResponse], summary="获取会话列表")
def list_agent_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AgentSessionResponse]:
    """获取当前用户会话列表。"""
    sessions = agent_service.list_sessions(db, current_user)
    return [_serialize_session(session) for session in sessions]


@router.post("/sessions", response_model=AgentSessionDetailResponse, summary="创建新会话")
def create_agent_session(
    data: AgentSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AgentSessionDetailResponse:
    """创建当前用户新会话。"""
    session = agent_service.create_session(
        db=db,
        user=current_user,
        project_id=data.project_id,
        title=data.title,
        skill_id=data.skill_id,
        system_prompt=data.system_prompt,
    )
    return _serialize_session_detail(session)


@router.get("/sessions/{session_id}", response_model=AgentSessionDetailResponse, summary="获取会话详情")
def get_agent_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AgentSessionDetailResponse:
    """获取当前用户指定会话详情。"""
    session = agent_service.get_session(db, current_user, session_id)
    return _serialize_session_detail(session)


@router.put("/sessions/{session_id}", response_model=AgentSessionDetailResponse, summary="更新会话")
def update_agent_session(
    session_id: int,
    data: AgentSessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AgentSessionDetailResponse:
    """更新当前用户会话配置。"""
    session = agent_service.update_session(
        db=db,
        user=current_user,
        session_id=session_id,
        update_data=data.model_dump(exclude_unset=True),
    )
    return _serialize_session_detail(session)


@router.get("/settings", response_model=AgentSettingResponse, summary="获取智能助理配置")
def get_agent_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AgentSettingResponse:
    """获取当前用户智能助理配置。"""
    setting = agent_service.get_or_create_setting(db, current_user)
    return AgentSettingResponse(
        model=setting.model,
        api_base_url=setting.api_base_url,
        has_api_key=bool(setting.api_key),
    )


@router.put("/settings", response_model=AgentSettingResponse, summary="更新智能助理配置")
def update_agent_settings(
    data: AgentSettingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AgentSettingResponse:
    """更新当前用户智能助理配置。"""
    setting = agent_service.update_setting(
        db,
        current_user,
        data.model_dump(exclude_unset=True),
    )
    return AgentSettingResponse(
        model=setting.model,
        api_base_url=setting.api_base_url,
        has_api_key=bool(setting.api_key),
    )


@router.post("/chat", response_model=AgentChatResponse, summary="智能助理对话")
async def chat_with_agent(
    data: AgentChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AgentChatResponse:
    """执行智能助理对话。"""
    session_id, answer, model, tool_calls = await agent_service.chat_with_agent(db, current_user, data)
    return AgentChatResponse(session_id=session_id, answer=answer, model=model, tool_calls=tool_calls)
