import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import api from '../../api/client';

const SEVERITY_COLORS = {
  致命: { bg: '#fef2f2', color: '#dc2626' },
  严重: { bg: '#fff7ed', color: '#ea580c' },
  一般: { bg: '#fffbeb', color: '#b45309' },
  轻微: { bg: '#f0fdf4', color: '#16a34a' },
};

const ISSUE_STATUS_COLORS = {
  待处理: { bg: '#f1f5f9', color: '#64748b' },
  处理中: { bg: '#eff6ff', color: '#2563eb' },
  已解决: { bg: '#ecfdf5', color: '#059669' },
  已关闭: { bg: '#f1f5f9', color: '#94a3b8' },
  已挂起: { bg: '#f5f3ff', color: '#7c3aed' },
};

const IssueTab = ({ projectId, members, canManage }) => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    severity: '一般',
    status: '待处理',
    assignee: '',
    resolution: '',
  });

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/projects/${projectId}/issues`);
      setIssues(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || '加载问题失败');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      title: '',
      description: '',
      severity: '一般',
      status: '待处理',
      assignee: '',
      resolution: '',
    });
    setExistingImages([]);
    setSelectedFiles([]);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description || '',
      severity: item.severity,
      status: item.status,
      assignee: item.assignee || '',
      resolution: item.resolution || '',
    });
    setExistingImages(item.images || []);
    setSelectedFiles([]);
    setShowModal(true);
  };

  const handleChange = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const selectedFilePreviews = useMemo(
    () => selectedFiles.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })),
    [selectedFiles],
  );

  useEffect(() => () => {
    selectedFilePreviews.forEach((item) => URL.revokeObjectURL(item.url));
  }, [selectedFilePreviews]);

  const handleSelectImages = (event) => {
    const nextFiles = Array.from(event.target.files || []);
    if (nextFiles.length === 0) {
      return;
    }
    setSelectedFiles((previous) => [...previous, ...nextFiles]);
    event.target.value = '';
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles((previous) => previous.filter((_, fileIndex) => fileIndex !== index));
  };

  const handleDeleteExistingImage = async (imageId) => {
    try {
      await api.delete(`/projects/issues/images/${imageId}`);
      setExistingImages((previous) => previous.filter((image) => image.id !== imageId));
      setNotice('图片已删除');
    } catch (err) {
      setError(err.response?.data?.detail || '删除图片失败');
    }
  };

  const uploadIssueImages = async (issueId) => {
    if (selectedFiles.length === 0) {
      return;
    }

    setUploadingImages(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append('files', file));
      const response = await api.post(`/projects/issues/${issueId}/images`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setExistingImages((previous) => [...previous, ...response.data]);
      setSelectedFiles([]);
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError('请输入问题标题');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        ...form,
        assignee: form.assignee || null,
        resolution: form.resolution || null,
      };
      let issueResponse;
      if (editingId) {
        issueResponse = await api.put(`/projects/issues/${editingId}`, payload);
        setNotice('问题已更新');
      } else {
        issueResponse = await api.post(`/projects/${projectId}/issues`, payload);
        setNotice('问题已创建');
      }
      await uploadIssueImages(issueResponse.data.id);
      setShowModal(false);
      await fetchIssues();
    } catch (err) {
      setError(err.response?.data?.detail || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定删除此问题？')) return;
    try {
      await api.delete(`/projects/issues/${id}`);
      setNotice('问题已删除');
      await fetchIssues();
    } catch (err) {
      setError(err.response?.data?.detail || '删除失败');
    }
  };

  return (
    <div>
      {error && (
        <div style={{ padding: 'var(--space-3) var(--space-4)', backgroundColor: 'var(--error-light)', color: 'var(--error)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 500, marginBottom: 'var(--space-4)' }}>
          {error}
        </div>
      )}
      {notice && (
        <div style={{ padding: 'var(--space-3) var(--space-4)', backgroundColor: 'var(--success-light)', color: 'var(--success)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 500, marginBottom: 'var(--space-4)' }}>
          {notice}
        </div>
      )}

      {canManage && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            <Plus size={16} /> 新增问题
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center" style={{ padding: 'var(--space-16)' }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : issues.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><AlertTriangle size={24} /></div>
            <div className="empty-state-title">暂无问题</div>
            <div className="empty-state-description">当前项目还没有问题记录</div>
          </div>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>问题标题</th>
                <th>严重程度</th>
                <th>状态</th>
                <th>指派人</th>
                <th>解决方案</th>
                {canManage && <th style={{ width: 80 }}>操作</th>}
              </tr>
            </thead>
            <tbody>
              {issues.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.title}</div>
                    {item.description && (
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="badge" style={{
                      backgroundColor: SEVERITY_COLORS[item.severity]?.bg || '#f1f5f9',
                      color: SEVERITY_COLORS[item.severity]?.color || '#64748b',
                    }}>
                      {item.severity}
                    </span>
                  </td>
                  <td>
                    <span className="badge" style={{
                      backgroundColor: ISSUE_STATUS_COLORS[item.status]?.bg || '#f1f5f9',
                      color: ISSUE_STATUS_COLORS[item.status]?.color || '#64748b',
                    }}>
                      {item.status}
                    </span>
                  </td>
                  <td>{item.assignee || '-'}</td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.resolution || '-'}
                  </td>
                  {canManage && (
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(item)} title="编辑">
                          <Pencil size={16} />
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(item.id)} title="删除" style={{ color: 'var(--error)' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-lg" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editingId ? '编辑问题' : '新增问题'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div>
                  <label className="form-label">问题标题 *</label>
                  <input className="input" value={form.title} onChange={(event) => handleChange('title', event.target.value)} placeholder="输入问题标题" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div>
                    <label className="form-label">严重程度</label>
                    <select className="select" value={form.severity} onChange={(event) => handleChange('severity', event.target.value)}>
                      {['致命', '严重', '一般', '轻微'].map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">状态</label>
                    <select className="select" value={form.status} onChange={(event) => handleChange('status', event.target.value)}>
                      {['待处理', '处理中', '已解决', '已关闭', '已挂起'].map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">指派人</label>
                    <select className="select" value={form.assignee} onChange={(event) => handleChange('assignee', event.target.value)}>
                      <option value="">未分配</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.name}>{member.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">问题描述</label>
                  <textarea className="textarea" value={form.description} onChange={(event) => handleChange('description', event.target.value)} placeholder="描述问题详情" />
                </div>
                <div>
                  <label className="form-label">问题图片</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <label className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>
                      <ImagePlus size={16} />
                      选择图片
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleSelectImages}
                        style={{ display: 'none' }}
                      />
                    </label>

                    {existingImages.length > 0 && (
                      <div>
                        <div className="form-hint" style={{ marginBottom: 'var(--space-2)' }}>已上传图片</div>
                        <div className="image-grid">
                          {existingImages.map((image) => (
                            <div key={image.id} className="image-card">
                              <img src={image.image_url} alt={image.original_name} className="image-card-preview" />
                              <button
                                type="button"
                                className="image-card-remove"
                                onClick={() => handleDeleteExistingImage(image.id)}
                                title="删除图片"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedFilePreviews.length > 0 && (
                      <div>
                        <div className="form-hint" style={{ marginBottom: 'var(--space-2)' }}>待上传图片</div>
                        <div className="image-grid">
                          {selectedFilePreviews.map((file, index) => (
                            <div key={`${file.name}-${index}`} className="image-card">
                              <img src={file.url} alt={file.name} className="image-card-preview" />
                              <button
                                type="button"
                                className="image-card-remove"
                                onClick={() => removeSelectedFile(index)}
                                title="移除图片"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="form-label">解决方案</label>
                  <textarea className="textarea" value={form.resolution} onChange={(event) => handleChange('resolution', event.target.value)} placeholder="解决方案" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving || uploadingImages ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IssueTab;
