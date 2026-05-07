import { useCallback, useEffect, useMemo, useState } from 'react';
import { Banknote, Pencil, Plus, Trash2, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import api from '../../api/client';

const TYPE_META = {
  expense: { label: '支出', icon: TrendingDown, color: 'var(--error)', bg: 'var(--error-light)' },
  income: { label: '收入', icon: TrendingUp, color: 'var(--success)', bg: 'var(--success-light)' },
};

const emptyForm = {
  title: '',
  record_type: 'expense',
  amount: '',
  person: '',
  occurred_on: '',
  category: '',
  description: '',
};

const formatMoney = (value) => Number(value || 0).toLocaleString('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const CostTab = ({ projectId, members, canManage }) => {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ total_expense: 0, total_income: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchCostRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/projects/${projectId}/costs`);
      setRecords(response.data.records);
      setSummary(response.data.summary);
    } catch (err) {
      setError(err.response?.data?.detail || '加载成本记录失败');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchCostRecords();
  }, [fetchCostRecords]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      record_type: item.record_type,
      amount: String(item.amount),
      person: item.person || '',
      occurred_on: item.occurred_on || '',
      category: item.category || '',
      description: item.description || '',
    });
    setShowModal(true);
  };

  const handleChange = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError('请输入记录标题');
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setError('请输入有效金额');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        ...form,
        amount: Number(form.amount).toFixed(2),
        person: form.person || null,
        occurred_on: form.occurred_on || null,
        category: form.category.trim() || null,
        description: form.description.trim() || null,
      };
      if (editingId) {
        await api.put(`/projects/costs/${editingId}`, payload);
        setNotice('成本记录已更新');
      } else {
        await api.post(`/projects/${projectId}/costs`, payload);
        setNotice('成本记录已创建');
      }
      setShowModal(false);
      await fetchCostRecords();
    } catch (err) {
      setError(err.response?.data?.detail || '保存成本记录失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定删除这条成本记录吗？')) return;
    try {
      await api.delete(`/projects/costs/${id}`);
      setNotice('成本记录已删除');
      await fetchCostRecords();
    } catch (err) {
      setError(err.response?.data?.detail || '删除成本记录失败');
    }
  };

  const summaryCards = useMemo(() => ([
    { key: 'income', label: '总收入', value: summary.total_income, icon: TrendingUp, color: 'var(--success)', bg: 'var(--success-light)' },
    { key: 'expense', label: '总支出', value: summary.total_expense, icon: TrendingDown, color: 'var(--error)', bg: 'var(--error-light)' },
    { key: 'balance', label: '当前结余', value: summary.balance, icon: Wallet, color: 'var(--accent)', bg: 'var(--accent-light)' },
  ]), [summary]);

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

      <div className="summary-grid" style={{ marginBottom: 'var(--space-5)' }}>
        {summaryCards.map(({ key, label, value, icon: Icon, color, bg }) => (
          <div key={key} className="summary-card">
            <div className="summary-card-icon" style={{ color, backgroundColor: bg }}>
              <Icon size={18} />
            </div>
            <div className="summary-card-label">{label}</div>
            <div className="summary-card-value">¥ {formatMoney(value)}</div>
          </div>
        ))}
      </div>

      {canManage && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            <Plus size={16} />
            新增记录
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center" style={{ padding: 'var(--space-16)' }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : records.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Banknote size={24} /></div>
            <div className="empty-state-title">暂无成本记录</div>
            <div className="empty-state-description">可以从这里开始记录项目的每一笔收入与支出。</div>
          </div>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>标题</th>
                <th>类型</th>
                <th className="num">金额</th>
                <th>人员</th>
                <th>日期</th>
                <th>分类</th>
                <th>备注</th>
                {canManage && <th style={{ width: 80 }}>操作</th>}
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const meta = TYPE_META[record.record_type] || TYPE_META.expense;
                const TypeIcon = meta.icon;
                return (
                  <tr key={record.id}>
                    <td style={{ fontWeight: 600 }}>{record.title}</td>
                    <td>
                      <span className="badge" style={{ backgroundColor: meta.bg, color: meta.color }}>
                        <TypeIcon size={12} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="num" style={{ color: meta.color, fontWeight: 700 }}>
                      ¥ {formatMoney(record.amount)}
                    </td>
                    <td>{record.person || '-'}</td>
                    <td>{record.occurred_on || '-'}</td>
                    <td>{record.category || '-'}</td>
                    <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {record.description || '-'}
                    </td>
                    {canManage && (
                      <td>
                        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(record)} title="编辑">
                            <Pencil size={16} />
                          </button>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(record.id)} title="删除" style={{ color: 'var(--error)' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-lg" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editingId ? '编辑成本记录' : '新增成本记录'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">记录标题 *</label>
                  <input className="input" value={form.title} onChange={(event) => handleChange('title', event.target.value)} placeholder="例如：云服务器采购" />
                </div>
                <div>
                  <label className="form-label">类型</label>
                  <select className="select" value={form.record_type} onChange={(event) => handleChange('record_type', event.target.value)}>
                    <option value="expense">支出</option>
                    <option value="income">收入</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">金额 *</label>
                  <input className="input" type="number" min="0" step="0.01" value={form.amount} onChange={(event) => handleChange('amount', event.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <label className="form-label">人员</label>
                  <select className="select" value={form.person} onChange={(event) => handleChange('person', event.target.value)}>
                    <option value="">未指定</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.name}>{member.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">发生日期</label>
                  <input className="input" type="date" value={form.occurred_on} onChange={(event) => handleChange('occurred_on', event.target.value)} />
                </div>
                <div>
                  <label className="form-label">分类</label>
                  <input className="input" value={form.category} onChange={(event) => handleChange('category', event.target.value)} placeholder="例如：设备、差旅、回款" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">备注</label>
                  <textarea className="textarea" value={form.description} onChange={(event) => handleChange('description', event.target.value)} placeholder="补充说明" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostTab;
