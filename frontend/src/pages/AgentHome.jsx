import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  FileSpreadsheet,
  FolderKanban,
  KeyRound,
  ListChecks,
  MessageSquareText,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';
import api from '../api/client';

const ACTIVE_SESSION_STORAGE_KEY = 'tinypm-agent-active-session-id';
const DEFAULT_MODEL = 'deepseek-v4-flash';
const DEFAULT_SKILL_ID = 'general';
const DEFAULT_SYSTEM_PROMPT = `你是一位资深的车载电子项目经理（PM），专注 OTA（Over-The-Air）升级与远程诊断领域，具备 10 年以上汽车电子行业经验。

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
- 了解回滚（Rollback）机制与故障安全（Fail-safe）策略`;

function getPlanRisk(plan) {
  if (plan.status === '已延迟') return '高';
  if ((plan.progress_pct || 0) < 30 && plan.planned_end) return '中';
  return '低';
}

function formatDate(value) {
  return value || '-';
}

function buildWelcomeMessage(skillName) {
  return {
    id: 'welcome',
    role: 'assistant',
    content: `我是 TinyPM 智能助理。当前技能：${skillName}。请选择项目后开始对话，我会通过 MCP 查询或回写项目数据。`,
    toolCalls: [],
  };
}

function formatSessionLabel(session) {
  const messageCount = session.message_count || 0;
  return `${session.title} · ${messageCount}条消息`;
}

function normalizeMessages(messages) {
  return (messages || []).map((message) => ({
    ...message,
    toolCalls: message.toolCalls || message.tool_calls || [],
    isError: Boolean(message.isError || message.is_error),
  }));
}

function buildPlanReviewPrompt(project, plan) {
  if (!project || !plan) {
    return '';
  }

  return [
    `请只审核当前选中的这一条计划记录，不要审核项目全部计划。`,
    `必须基于 MCP 工具 get_project_plan 读取 plan_id=${plan.id} 的单条记录后再回答；不要使用 list_project_plans 做全量扫描。`,
    `项目：${project.name}（project_id=${project.id}）`,
    `计划ID：${plan.id}`,
    `阶段：${plan.phase_name || '未填写'}`,
    `一级任务：${plan.primary_task || '未填写'}`,
    `二级任务：${plan.secondary_task || '未填写'}`,
    `依赖项：${plan.dependency || '未填写'}`,
    `状态：${plan.status || '未填写'}`,
    `进度：${plan.progress_pct ?? 0}%`,
    `计划周期：${formatDate(plan.planned_start)} 至 ${formatDate(plan.planned_end)}`,
    `负责人：${plan.assignee || '未分配'}`,
    `请输出这条计划的字段缺失、延期风险、依赖风险和建议动作。`,
  ].join('\n');
}

const AgentHome = () => {
  const [projects, setProjects] = useState([]);
  const [plans, setPlans] = useState([]);
  const [skills, setSkills] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [settings, setSettings] = useState({
    model: DEFAULT_MODEL,
    api_base_url: 'https://api.deepseek.com/v1',
    has_api_key: false,
  });
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [activeSessionId, setActiveSessionId] = useState('');
  const [selectedSkillId, setSelectedSkillId] = useState(DEFAULT_SKILL_ID);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [plansLoading, setPlansLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [promptSaving, setPromptSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [projectAuditNotice, setProjectAuditNotice] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);

  const selectedProject = useMemo(
    () => projects.find((project) => String(project.id) === String(selectedProjectId)),
    [projects, selectedProjectId],
  );

  const selectedPlan = useMemo(
    () => plans.find((plan) => String(plan.id) === String(selectedPlanId)) || plans[0],
    [plans, selectedPlanId],
  );

  const selectedSkill = useMemo(
    () => skills.find((skill) => skill.id === selectedSkillId) || skills[0] || null,
    [skills, selectedSkillId],
  );

  const hasProjectContext = Boolean(selectedProjectId);
  const displayMessages = useMemo(
    () => (messages.length > 0 ? messages : [buildWelcomeMessage(selectedSkill?.name || '通用项目助理')]),
    [messages, selectedSkill],
  );

  const dashboardStats = useMemo(() => {
    const projectCount = projects.length;
    const activeCount = projects.filter((project) => project.status === '进行中').length;
    const planCount = selectedProject ? plans.length : projects.reduce((sum, project) => sum + (project.plan_count || 0), 0);
    const riskCount = plans.filter((plan) => getPlanRisk(plan) !== '低').length;
    return { projectCount, activeCount, planCount, riskCount };
  }, [plans, projects, selectedProject]);

  const fetchSessionSummaries = useCallback(async () => {
    const response = await api.get('/agent/sessions');
    setSessions(response.data);
    return response.data;
  }, []);

  const applySessionDetail = useCallback((detail, fallbackProjectId = '') => {
    const nextSessionId = String(detail.id);
    setActiveSessionId(nextSessionId);
    localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, nextSessionId);
    setSelectedSkillId(detail.skill_id || DEFAULT_SKILL_ID);
    setSelectedProjectId(detail.project_id ? String(detail.project_id) : fallbackProjectId);
    setSystemPrompt(detail.system_prompt || DEFAULT_SYSTEM_PROMPT);
    setMessages(normalizeMessages(detail.messages));
  }, []);

  const loadSessionDetail = useCallback(async (sessionId, fallbackProjectId = '') => {
    const response = await api.get(`/agent/sessions/${sessionId}`);
    applySessionDetail(response.data, fallbackProjectId);
    return response.data;
  }, [applySessionDetail]);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [settingsResponse, projectsResponse, skillsResponse, sessionsResponse] = await Promise.all([
        api.get('/agent/settings'),
        api.get('/projects'),
        api.get('/agent/skills'),
        api.get('/agent/sessions'),
      ]);

      const nextProjects = projectsResponse.data;
      const nextSkills = skillsResponse.data;
      const nextSessions = sessionsResponse.data;
      const fallbackProjectId = nextProjects[0] ? String(nextProjects[0].id) : '';
      const preferredSessionId = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);

      setSettings(settingsResponse.data);
      setProjects(nextProjects);
      setSkills(nextSkills);
      setSessions(nextSessions);

      if (nextSessions.length > 0) {
        const preferredSession =
          nextSessions.find((session) => String(session.id) === String(preferredSessionId)) ||
          nextSessions[0];
        await loadSessionDetail(preferredSession.id, fallbackProjectId);
      } else {
        setActiveSessionId('');
        localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
        setSelectedProjectId(fallbackProjectId);
        setSelectedSkillId(nextSkills[0]?.id || DEFAULT_SKILL_ID);
        setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
        setMessages([]);
      }
    } catch (err) {
      setError(err.response?.data?.detail || '加载智能助理失败');
    } finally {
      setLoading(false);
    }
  }, [loadSessionDetail]);

  const fetchPlans = useCallback(async (projectId) => {
    if (!projectId) {
      setPlans([]);
      setSelectedPlanId('');
      return;
    }
    setPlansLoading(true);
    try {
      const response = await api.get(`/projects/${projectId}/plans`);
      setPlans(response.data);
      setSelectedPlanId(response.data[0] ? String(response.data[0].id) : '');
    } catch (err) {
      setError(err.response?.data?.detail || '加载项目计划失败');
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    fetchPlans(selectedProjectId);
    setReviewed(false);
    setProjectAuditNotice('');
  }, [fetchPlans, selectedProjectId]);

  const handleSettingChange = (field, value) => {
    setSettings((previous) => ({ ...previous, [field]: value }));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        model: settings.model || DEFAULT_MODEL,
        api_base_url: settings.api_base_url,
      };
      if (apiKeyInput.trim()) {
        payload.api_key = apiKeyInput.trim();
      }
      const response = await api.put('/agent/settings', payload);
      setSettings(response.data);
      setApiKeyInput('');
      setNotice('智能助理配置已保存');
    } catch (err) {
      setError(err.response?.data?.detail || '保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const ensureSession = useCallback(async () => {
    if (activeSessionId) {
      return Number(activeSessionId);
    }
    const response = await api.post('/agent/sessions', {
      project_id: selectedProjectId ? Number(selectedProjectId) : null,
      skill_id: selectedSkillId,
      system_prompt: systemPrompt || DEFAULT_SYSTEM_PROMPT,
    });
    applySessionDetail(response.data, selectedProjectId);
    await fetchSessionSummaries();
    return response.data.id;
  }, [activeSessionId, applySessionDetail, fetchSessionSummaries, selectedProjectId, selectedSkillId, systemPrompt]);

  const handleSessionChange = async (sessionId) => {
    setSessionBusy(true);
    setError('');
    try {
      await loadSessionDetail(sessionId, selectedProjectId);
    } catch (err) {
      setError(err.response?.data?.detail || '加载会话失败');
    } finally {
      setSessionBusy(false);
    }
  };

  const handleNewSession = async () => {
    setSessionBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await api.post('/agent/sessions', {
        project_id: selectedProjectId ? Number(selectedProjectId) : null,
        skill_id: selectedSkillId,
        system_prompt: systemPrompt || DEFAULT_SYSTEM_PROMPT,
      });
      applySessionDetail(response.data, selectedProjectId);
      await fetchSessionSummaries();
      setInput('');
      setNotice('已创建新对话');
    } catch (err) {
      setError(err.response?.data?.detail || '创建新对话失败');
    } finally {
      setSessionBusy(false);
    }
  };

  const handleProjectChange = async (value) => {
    setSelectedProjectId(value);
    setReviewed(false);
    setProjectAuditNotice('');
    if (!activeSessionId) {
      return;
    }
    try {
      await api.put(`/agent/sessions/${activeSessionId}`, {
        project_id: value ? Number(value) : null,
      });
      await fetchSessionSummaries();
    } catch (err) {
      setError(err.response?.data?.detail || '更新会话项目上下文失败');
    }
  };

  const handleSkillChange = async (value) => {
    setSelectedSkillId(value);
    if (!activeSessionId) {
      return;
    }
    try {
      await api.put(`/agent/sessions/${activeSessionId}`, {
        skill_id: value,
      });
      await fetchSessionSummaries();
    } catch (err) {
      setError(err.response?.data?.detail || '更新会话技能失败');
    }
  };

  const handleSaveSystemPrompt = async () => {
    setPromptSaving(true);
    setError('');
    setNotice('');
    try {
      const sessionId = await ensureSession();
      await api.put(`/agent/sessions/${sessionId}`, {
        system_prompt: systemPrompt || DEFAULT_SYSTEM_PROMPT,
      });
      await loadSessionDetail(sessionId, selectedProjectId);
      await fetchSessionSummaries();
      setNotice('系统 Prompt 已保存');
    } catch (err) {
      setError(err.response?.data?.detail || '保存系统 Prompt 失败');
    } finally {
      setPromptSaving(false);
    }
  };

  const sendAgentMessage = async (message) => {
    if (sending || !message || !hasProjectContext) return;

    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    setMessages((previous) => [...previous, { role: 'user', content: trimmedMessage, toolCalls: [] }]);
    setInput('');
    setSending(true);
    setError('');
    setNotice('');

    let sessionId = activeSessionId;
    try {
      sessionId = String(await ensureSession());
      const payload = {
        message: trimmedMessage,
        session_id: Number(sessionId),
        project_id: selectedProjectId ? Number(selectedProjectId) : null,
        skill_id: selectedSkillId,
        system_prompt: systemPrompt || DEFAULT_SYSTEM_PROMPT,
        model: settings.model || DEFAULT_MODEL,
      };
      if (apiKeyInput.trim()) {
        payload.api_key = apiKeyInput.trim();
      }

      const response = await api.post('/agent/chat', payload);
      await loadSessionDetail(response.data.session_id, selectedProjectId);
      await fetchSessionSummaries();
    } catch (err) {
      if (sessionId) {
        try {
          await loadSessionDetail(sessionId, selectedProjectId);
          await fetchSessionSummaries();
          return;
        } catch (loadErr) {
          void loadErr;
        }
      }
      setMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          content: err.response?.data?.detail || '智能助理调用失败',
          toolCalls: [],
          isError: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    await sendAgentMessage(input);
  };

  const handleQuickPrompt = (prompt) => {
    if (sending || !hasProjectContext) return;
    sendAgentMessage(prompt);
  };

  const handleProjectAudit = () => {
    if (sending || !hasProjectContext || !selectedProject) return;

    setProjectAuditNotice(
      `已发起「${selectedProject.name}」项目总审，结果会进入下方项目数据 Agent 会话，并保存在当前 session 中。`,
    );
    sendAgentMessage(
      `请对当前项目「${selectedProject.name}」发起项目总审。请覆盖整体计划风险、字段缺失、延期项、依赖风险和建议动作，并明确说明本次审核基于 MCP 读取的当前项目数据。`,
    );
  };

  const handleSelectedPlanReview = () => {
    if (sending || !hasProjectContext || !selectedProject || !selectedPlan) return;

    setReviewed(true);
    sendAgentMessage(buildPlanReviewPrompt(selectedProject, selectedPlan));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ padding: 'var(--space-16)' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <div className="agent-workspace animate-fade-in">
      <div className="agent-topbar">
        <div>
          <h1 className="page-title">智能助理工作台</h1>
          <p className="page-description">
            在 TinyPM 现有工作区内汇总项目计划、AI 审核和 MCP 项目数据
          </p>
        </div>
        <div className="agent-topbar-actions">
          <button className="btn btn-secondary" onClick={fetchInitialData}>
            <RefreshCw size={16} />
            刷新
          </button>
        </div>
      </div>

      {error && (
        <div className="agent-alert agent-alert-error">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}
      {notice && (
        <div className="agent-alert agent-alert-success">
          <CheckCircle2 size={16} />
          {notice}
        </div>
      )}

      <div className="agent-summary-band">
        <div className="agent-stat-card">
          <span>项目总数</span>
          <strong>{dashboardStats.projectCount}</strong>
          <small>通过 MCP `list_projects` 获取</small>
        </div>
        <div className="agent-stat-card">
          <span>进行中项目</span>
          <strong>{dashboardStats.activeCount}</strong>
          <small>用于定位近期协作重点</small>
        </div>
        <div className="agent-stat-card">
          <span>当前计划</span>
          <strong>{dashboardStats.planCount}</strong>
          <small>{selectedProject ? selectedProject.name : '全局项目汇总'}</small>
        </div>
        <div className="agent-stat-card">
          <span>AI 关注项</span>
          <strong>{dashboardStats.riskCount}</strong>
          <small>进度、状态和计划周期校验</small>
        </div>
      </div>

      <div className="agent-main-grid">
        <section className="agent-panel agent-console">
          <div className="agent-panel-header">
            <div className="agent-panel-heading">
              <span className="agent-panel-icon">
                <FolderKanban size={18} />
              </span>
              <div>
                <div className="agent-panel-title">工作台</div>
                <div className="agent-panel-description">项目上下文、计划清单和当前任务视图</div>
              </div>
            </div>
            <div className="agent-workbench-actions">
              <div className="agent-project-picker">
                <span>当前项目</span>
                <select
                  className="select agent-project-select"
                  value={selectedProjectId}
                  onChange={(event) => handleProjectChange(event.target.value)}
                >
                  <option value="">选择项目</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleProjectAudit}
                disabled={sending || !hasProjectContext}
              >
                <Sparkles size={16} />
                发起项目总审
              </button>
            </div>
          </div>

          {selectedProject && (
            <div className="agent-context-strip">
              <div>
                <span>项目名称</span>
                <strong>{selectedProject.name}</strong>
              </div>
              <div>
                <span>项目状态</span>
                <strong>{selectedProject.status}</strong>
              </div>
              <div>
                <span>MCP project_id</span>
                <strong>{selectedProject.id}</strong>
              </div>
              <div>
                <span>计划记录</span>
                <strong>{plans.length}</strong>
              </div>
            </div>
          )}

          {projectAuditNotice && (
            <div className="agent-context-notice">
              <div>
                <CheckCircle2 size={16} />
                <span>{projectAuditNotice}</span>
              </div>
              <a className="btn btn-secondary btn-sm" href="#agent-chat-panel">
                查看 Agent 会话
              </a>
            </div>
          )}

          {plansLoading ? (
            <div className="flex items-center justify-center" style={{ padding: 'var(--space-12)' }}>
              <div className="spinner spinner-lg" />
            </div>
          ) : plans.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><FileSpreadsheet size={24} /></div>
              <div className="empty-state-title">暂无计划数据</div>
              <div className="empty-state-description">选择项目后可从项目计划页导入 Excel 或新增计划</div>
            </div>
          ) : (
            <div className="agent-plan-table-wrap">
              <table className="agent-plan-table">
                <thead>
                  <tr>
                    <th>阶段</th>
                    <th>任务</th>
                    <th>状态</th>
                    <th>进度</th>
                    <th>计划周期</th>
                    <th>负责人</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr
                      key={plan.id}
                      className={selectedPlan?.id === plan.id ? 'selected' : ''}
                      onClick={() => setSelectedPlanId(String(plan.id))}
                    >
                      <td className="agent-phase-cell">{plan.phase_name}</td>
                      <td>
                        <div className="agent-task-main">
                          <strong>{plan.primary_task || plan.phase_name}</strong>
                          <span>{plan.secondary_task || plan.description || '未填写二级任务'}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`agent-status ${getPlanRisk(plan) === '高' ? 'risk' : plan.status === '已完成' ? 'done' : 'doing'}`}>
                          {plan.status}
                        </span>
                      </td>
                      <td>
                        <div className="agent-progress-cell">
                          <strong>{plan.progress_pct || 0}%</strong>
                          <div className="agent-mini-progress">
                            <span style={{ width: `${plan.progress_pct || 0}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="agent-date-cell">
                        {formatDate(plan.planned_start)}
                        <br />
                        {formatDate(plan.planned_end)}
                      </td>
                      <td>{plan.assignee || '未分配'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="agent-panel agent-review-panel">
          <div className="agent-panel-header">
            <div className="agent-panel-heading">
              <span className="agent-panel-icon">
                <ShieldCheck size={18} />
              </span>
              <div>
                <div className="agent-panel-title">AI 审核</div>
                <div className="agent-panel-description">字段完整性和风险判断</div>
              </div>
            </div>
          </div>

          {selectedPlan ? (
            <div className="agent-review-body">
              <div className="agent-kv">
                <span>计划 ID</span>
                <strong>{selectedPlan.id}</strong>
              </div>
              <div className="agent-kv">
                <span>数据来源</span>
                <strong>project_plans</strong>
              </div>
              <div className="agent-kv">
                <span>风险等级</span>
                <strong>{getPlanRisk(selectedPlan)}</strong>
              </div>

              <ul className="agent-check-list">
                <li className={selectedPlan.primary_task ? 'ok' : 'warn'}>
                  <CheckCircle2 size={16} />
                  <span>{selectedPlan.primary_task ? '一级任务已填写' : '缺少一级任务，导入模板时应补齐 B 列'}</span>
                </li>
                <li className={selectedPlan.secondary_task ? 'ok' : 'warn'}>
                  <CheckCircle2 size={16} />
                  <span>{selectedPlan.secondary_task ? '二级任务已填写' : '二级任务为空，可作为阶段级任务处理'}</span>
                </li>
                <li className={selectedPlan.planned_start && selectedPlan.planned_end ? 'ok' : 'warn'}>
                  <CheckCircle2 size={16} />
                  <span>{selectedPlan.planned_start && selectedPlan.planned_end ? '计划周期完整' : '计划开始或结束时间缺失'}</span>
                </li>
                <li className={(selectedPlan.progress_pct || 0) >= 0 && (selectedPlan.progress_pct || 0) <= 100 ? 'ok' : 'warn'}>
                  <CheckCircle2 size={16} />
                  <span>当前进度符合 0-100 的数据约束</span>
                </li>
              </ul>

              <div className="agent-review-note">
                {reviewed
                  ? 'AI 审核已更新：建议优先补齐任务层级、责任人和依赖项，再做后续计划调整。'
                  : '点击“审核当前计划”后，结果会进入下方会话，并持续保留在当前 session 中。'}
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={handleSelectedPlanReview}
                disabled={sending || !hasProjectContext}
              >
                <Sparkles size={16} />
                审核当前计划
              </button>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon"><ShieldCheck size={24} /></div>
              <div className="empty-state-title">等待计划数据</div>
              <div className="empty-state-description">选择项目或导入计划后显示 AI 审核结果</div>
            </div>
          )}
        </aside>
      </div>

      <div className="agent-agent-grid">
        <section id="agent-chat-panel" className="agent-panel agent-chat-panel">
          <div className="agent-panel-header">
            <div className="agent-panel-heading">
              <span className="agent-panel-icon">
                <Bot size={18} />
              </span>
              <div>
                <div className="agent-panel-title">项目数据 Agent</div>
                <div className="agent-panel-description">
                  {settings.has_api_key ? '通过 MCP 读取并回写当前项目数据' : '需要填写 DeepSeek API Key'}
                </div>
              </div>
            </div>
          </div>

          <div className="agent-session-bar">
            <div className="agent-session-picker">
              <span>对话</span>
              <select
                className="select"
                value={activeSessionId}
                onChange={(event) => handleSessionChange(event.target.value)}
                disabled={sessionBusy || sessions.length === 0}
              >
                <option value="">选择对话</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {formatSessionLabel(session)}
                  </option>
                ))}
              </select>
            </div>
            <div className="agent-session-picker">
              <span>Skill</span>
              <select
                className="select"
                value={selectedSkillId}
                onChange={(event) => handleSkillChange(event.target.value)}
              >
                {skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-secondary" onClick={handleNewSession} disabled={sessionBusy}>
              <Plus size={16} />
              新对话
            </button>
          </div>

          <div className="agent-settings-inline">
            <input
              className="input"
              value={settings.model}
              onChange={(event) => handleSettingChange('model', event.target.value)}
              placeholder={DEFAULT_MODEL}
            />
            <input
              className="input"
              value={settings.api_base_url}
              onChange={(event) => handleSettingChange('api_base_url', event.target.value)}
              placeholder="https://api.deepseek.com/v1"
            />
            <div className="input-group">
              <span className="input-icon"><KeyRound size={16} /></span>
              <input
                className="input"
                type="password"
                value={apiKeyInput}
                onChange={(event) => setApiKeyInput(event.target.value)}
                placeholder={settings.has_api_key ? '已保存，留空不修改' : '输入 API Key'}
              />
            </div>
            <button className="btn btn-secondary" onClick={handleSaveSettings} disabled={saving}>
              <Settings2 size={16} />
              {saving ? '保存中...' : '保存'}
            </button>
          </div>

          <div className="agent-action-bar">
            <button className="btn btn-secondary btn-sm" onClick={() => handleQuickPrompt('列出当前项目计划中的延期风险，并给出处理建议。')} disabled={sending || !hasProjectContext}>
              <ListChecks size={15} />
              风险清单
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleQuickPrompt('请把当前项目计划按阶段汇总，并指出一级任务和二级任务缺失情况。')} disabled={sending || !hasProjectContext}>
              <FileSpreadsheet size={15} />
              字段审核
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleQuickPrompt('请为当前项目生成下一次项目周会的计划跟踪摘要。')} disabled={sending || !hasProjectContext}>
              <MessageSquareText size={15} />
              周会摘要
            </button>
          </div>

          <div className="agent-system-prompt">
            <div className="agent-system-prompt-header">
              <div>
                <strong>系统 Prompt</strong>
                <span>当前会话的角色设定，后续对话都会使用这段 Prompt。</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleSaveSystemPrompt} disabled={promptSaving}>
                {promptSaving ? '保存中...' : '保存 Prompt'}
              </button>
            </div>
            <textarea
              className="textarea agent-system-prompt-input"
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
              disabled={promptSaving}
            />
          </div>

          <div className="agent-thread">
            {displayMessages.map((message, index) => (
              <div key={`${message.id || message.role}-${index}`} className={`agent-message ${message.role}${message.isError ? ' error' : ''}`}>
                <div className="agent-message-role">
                  {message.role === 'user' ? '你' : 'TinyPM Agent'}
                  {message.model && <span>{message.model}</span>}
                </div>
                <div className="agent-message-content">{message.content}</div>
                {message.toolCalls?.length > 0 && (
                  <div className="agent-tool-list">
                    {message.toolCalls.map((toolCall, toolIndex) => (
                      <div key={`${toolCall.name}-${toolIndex}`} className="agent-tool-item">
                        <Wrench size={14} />
                        <div>
                          <div className="agent-tool-name">
                            {toolCall.name}
                            <span className={toolCall.success ? 'success' : 'error'}>
                              {toolCall.success ? '成功' : '失败'}
                            </span>
                          </div>
                          <div className="agent-tool-preview">{toolCall.result_preview}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="agent-message assistant">
                <div className="agent-message-role">TinyPM Agent</div>
                <div className="agent-message-content">
                  <span className="spinner spinner-sm" />
                  正在调用 MCP 工具和模型...
                </div>
              </div>
            )}
          </div>

          <div className="agent-composer">
            <textarea
              className="textarea"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                  handleSend();
                }
              }}
              placeholder="例如：把台架测试提前一周，保持结束日期不变并自动重算工期"
              disabled={sending || !hasProjectContext}
            />
            <button className="btn btn-primary btn-lg" onClick={handleSend} disabled={sending || !input.trim() || !hasProjectContext}>
              <Send size={18} />
              发送
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AgentHome;
