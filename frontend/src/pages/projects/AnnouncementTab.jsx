import { useEffect, useMemo, useState } from 'react';
import { Pencil, Save } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import api from '../../api/client';

const EMPTY_TEXT = [
  '## 项目公告',
  '',
  '- 在这里记录当前项目的重要通知',
  '- 支持标题、列表、加粗、链接等 Markdown 语法',
].join('\n');

const AnnouncementTab = ({ project, canManage, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState(project.announcement_markdown || '');

  useEffect(() => {
    setDraft(project.announcement_markdown || '');
  }, [project.announcement_markdown]);

  const previewContent = useMemo(() => draft.trim() || EMPTY_TEXT, [draft]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await api.put(`/projects/${project.id}`, {
        announcement_markdown: draft.trim() || null,
      });
      setNotice('项目公告已更新');
      setEditing(false);
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.detail || '保存公告失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">项目公告</span>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          {error && <span style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{error}</span>}
          {notice && <span style={{ color: 'var(--success)', fontSize: '0.875rem' }}>{notice}</span>}
          {canManage && !editing && (
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
              <Pencil size={16} />
              编辑公告
            </button>
          )}
          {canManage && editing && (
            <>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setEditing(false);
                  setDraft(project.announcement_markdown || '');
                }}
              >
                取消
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                <Save size={16} />
                {saving ? '保存中...' : '保存公告'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card-body">
        <div style={{ display: 'grid', gridTemplateColumns: editing ? '1.05fr 0.95fr' : '1fr', gap: 'var(--space-5)' }}>
          {editing && (
            <div>
              <label className="form-label">Markdown 编辑区</label>
              <textarea
                className="textarea"
                style={{ minHeight: 360 }}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="输入项目公告内容，支持 Markdown"
              />
              <div className="form-hint">支持标题、列表、粗体、引用、代码块和链接。</div>
            </div>
          )}

          <div>
            {editing && <label className="form-label">实时预览</label>}
            <div className="markdown-preview">
              <ReactMarkdown>{previewContent}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementTab;
