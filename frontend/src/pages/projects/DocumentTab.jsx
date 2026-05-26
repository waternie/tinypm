import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, Eye, FileText, ImagePlus, RefreshCw, Trash2, X } from 'lucide-react';
import JSZip from 'jszip';
import mammoth from 'mammoth/mammoth.browser';
import ReactMarkdown from 'react-markdown';
import * as XLSX from 'xlsx';
import api from '../../api/client';

const emptyState = {
  project_id: 0,
  files: [],
};

const ROOT_GROUP = '根目录';
const MAX_PREVIEW_SHEETS = 5;
const MAX_PREVIEW_ROWS = 120;
const MAX_PREVIEW_COLUMNS = 40;
const PREVIEW_FETCH_TIMEOUT_MS = 15000;

const formatBytes = (size) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileKind = (file) => {
  const name = (file.original_name || file.name || '').toLowerCase();
  if (name.endsWith('.md') || name.endsWith('.markdown')) return 'markdown';
  if (name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.docx')) return 'docx';
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) return 'sheet';
  if (name.endsWith('.pptx')) return 'pptx';
  if (name.endsWith('.txt') || name.endsWith('.json') || name.endsWith('.log')) return 'text';
  if (/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(name)) return 'image';
  return 'other';
};

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

const fetchPreviewResource = async (url) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PREVIEW_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`文档读取失败（HTTP ${response.status}）`);
    }
    return response;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('文档读取超时，请稍后重试或下载后查看');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
};

const getLimitedSheetRange = (worksheet) => {
  if (!worksheet?.['!ref']) {
    return null;
  }

  const originalRange = XLSX.utils.decode_range(worksheet['!ref']);
  return {
    originalRange,
    limitedRange: {
      s: { ...originalRange.s },
      e: {
        r: Math.min(originalRange.e.r, originalRange.s.r + MAX_PREVIEW_ROWS - 1),
        c: Math.min(originalRange.e.c, originalRange.s.c + MAX_PREVIEW_COLUMNS - 1),
      },
    },
  };
};

const buildWorkbookPreviewHtml = (workbook) => {
  const sheetNames = workbook.SheetNames.slice(0, MAX_PREVIEW_SHEETS);
  const sheetLimitNote = workbook.SheetNames.length > MAX_PREVIEW_SHEETS
    ? `<div class="doc-preview-note">仅展示前 ${MAX_PREVIEW_SHEETS} 个工作表，共 ${workbook.SheetNames.length} 个。</div>`
    : '';

  const sections = sheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const ranges = getLimitedSheetRange(worksheet);

    if (!ranges) {
      return `<section style="margin-bottom:16px"><h3>${escapeHtml(sheetName)}</h3><div class="empty-state-description">该工作表暂无可预览内容。</div></section>`;
    }

    const { originalRange, limitedRange } = ranges;
    const originalRows = originalRange.e.r - originalRange.s.r + 1;
    const originalColumns = originalRange.e.c - originalRange.s.c + 1;
    const limitParts = [];

    if (originalRows > MAX_PREVIEW_ROWS) {
      limitParts.push(`前 ${MAX_PREVIEW_ROWS} 行`);
    }
    if (originalColumns > MAX_PREVIEW_COLUMNS) {
      limitParts.push(`前 ${MAX_PREVIEW_COLUMNS} 列`);
    }

    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
      range: limitedRange,
    });
    const tableRows = rows.map((row, rowIndex) => {
      const tag = rowIndex === 0 ? 'th' : 'td';
      const visibleCells = row.slice(0, MAX_PREVIEW_COLUMNS);
      const cells = visibleCells.length > 0
        ? visibleCells.map((cell) => `<${tag}>${escapeHtml(cell)}</${tag}>`).join('')
        : `<${tag}></${tag}>`;
      return `<tr>${cells}</tr>`;
    }).join('');
    const limitNote = limitParts.length > 0
      ? `<p class="doc-preview-note">该工作表范围较大，仅展示${limitParts.join('、')}。</p>`
      : '';
    const table = tableRows
      ? `<table><tbody>${tableRows}</tbody></table>`
      : '<div class="empty-state-description">该工作表暂无可预览内容。</div>';

    return `<section style="margin-bottom:16px"><h3>${escapeHtml(sheetName)}</h3>${limitNote}${table}</section>`;
  }).join('');

  return sheetLimitNote + (sections || '<div class="empty-state-description">未解析到可展示的表格内容。</div>');
};

const DocumentTab = ({ projectId, canManage }) => {
  const [state, setState] = useState(emptyState);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [targetDirectory, setTargetDirectory] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [preview, setPreview] = useState({ kind: 'empty', content: '', html: '', slides: [], error: '' });
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/projects/${projectId}/documents`);
      setState(response.data);
      if (response.data.files.length > 0) {
        setSelectedDocumentId((current) => current ?? response.data.files[0].id);
      } else {
        setSelectedDocumentId(null);
        setPreview({ kind: 'empty', content: '', html: '', slides: [], error: '' });
      }
    } catch (err) {
      setError(err.response?.data?.detail || '加载文档管理失败');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const documents = state.files || [];
  const groupedDocuments = useMemo(() => {
    const groups = new Map();
    for (const file of documents) {
      const key = file.directory || ROOT_GROUP;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(file);
    }
    return Array.from(groups.entries()).map(([directory, files]) => ({ directory, files }));
  }, [documents]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const selectedDocument = useMemo(
    () => documents.find((file) => file.id === selectedDocumentId) || null,
    [documents, selectedDocumentId],
  );

  useEffect(() => {
    const nextState = {};
    groupedDocuments.forEach((group, index) => {
      nextState[group.directory] = expandedGroups[group.directory] ?? index === 0;
    });
    setExpandedGroups(nextState);
  }, [documents.length]);

  const selectedFilePreviews = useMemo(
    () => selectedFiles.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })),
    [selectedFiles],
  );

  useEffect(() => () => {
    selectedFilePreviews.forEach((item) => URL.revokeObjectURL(item.url));
  }, [selectedFilePreviews]);

  const loadPreview = useCallback(async (file) => {
    if (!file) {
      setPreview({ kind: 'empty', content: '', html: '', slides: [], error: '' });
      return;
    }

    setPreviewLoading(true);
    setPreview({ kind: 'loading', content: '', html: '', slides: [], error: '' });
    try {
      const kind = getFileKind(file);

      if (kind === 'pdf' || kind === 'image') {
        setPreview({ kind, content: file.file_url, html: '', slides: [], error: '' });
        return;
      }

      if (kind === 'markdown' || kind === 'text') {
        const response = await fetchPreviewResource(file.file_url);
        const text = await response.text();
        setPreview({ kind, content: text, html: '', slides: [], error: '' });
        return;
      }

      if (kind === 'docx') {
        const response = await fetchPreviewResource(file.file_url);
        const arrayBuffer = await response.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setPreview({ kind, content: '', html: result.value, slides: [], error: '' });
        return;
      }

      if (kind === 'sheet') {
        if ((file.original_name || '').toLowerCase().endsWith('.csv')) {
          const response = await fetchPreviewResource(file.file_url);
          const text = await response.text();
          const workbook = XLSX.read(text, { type: 'string', sheetRows: MAX_PREVIEW_ROWS });
          const html = buildWorkbookPreviewHtml(workbook);
          setPreview({ kind, content: '', html, slides: [], error: '' });
          return;
        }

        const response = await fetchPreviewResource(file.file_url);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array', sheetRows: MAX_PREVIEW_ROWS });
        const html = buildWorkbookPreviewHtml(workbook);
        setPreview({ kind, content: '', html, slides: [], error: '' });
        return;
      }

      if (kind === 'pptx') {
        const response = await fetchPreviewResource(file.file_url);
        const arrayBuffer = await response.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        const slideEntries = Object.keys(zip.files)
          .filter((key) => /^ppt\/slides\/slide\d+\.xml$/.test(key))
          .sort((left, right) => Number(left.match(/\d+/)?.[0]) - Number(right.match(/\d+/)?.[0]));

        const slides = [];
        for (const entry of slideEntries) {
          const xml = await zip.files[entry].async('string');
          const texts = [...xml.matchAll(/<a:t>(.*?)<\/a:t>/g)].map((match) => match[1]);
          slides.push(texts.join(' ').trim() || '（该页无文本内容）');
        }
        setPreview({ kind, content: '', html: '', slides, error: '' });
        return;
      }

      setPreview({ kind: 'other', content: '', html: '', slides: [], error: '' });
    } catch (err) {
      setPreview({
        kind: 'error',
        content: '',
        html: '',
        slides: [],
        error: err.message || '预览文档失败',
      });
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreview(selectedDocument);
  }, [loadPreview, selectedDocument]);

  const handleSelectUploadFiles = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }
    setSelectedFiles((previous) => [...previous, ...files]);
    event.target.value = '';
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles((previous) => previous.filter((_, fileIndex) => fileIndex !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('请先选择要上传的文件');
      return;
    }

    setUploading(true);
    setError('');
    setNotice('');
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append('files', file));
      await api.post(`/projects/${projectId}/documents/upload`, formData, {
        params: {
          directory: targetDirectory.trim() || null,
        },
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSelectedFiles([]);
      setTargetDirectory('');
      setNotice('文档上传完成');
      await fetchDocuments();
    } catch (err) {
      setError(err.response?.data?.detail || '上传文档失败');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('确定删除这个文档吗？')) return;
    try {
      await api.delete(`/projects/documents/${documentId}`);
      setNotice('文档已删除');
      await fetchDocuments();
    } catch (err) {
      setError(err.response?.data?.detail || '删除文档失败');
    }
  };

  const toggleGroup = (directory) => {
    setExpandedGroups((previous) => ({
      ...previous,
      [directory]: !previous[directory],
    }));
  };

  const handleDocumentKeyDown = (event, documentId) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    setSelectedDocumentId(documentId);
  };

  const renderPreview = () => {
    if (previewLoading) {
      return (
        <div className="flex items-center justify-center" style={{ padding: 'var(--space-16)' }}>
          <div className="spinner spinner-lg" />
        </div>
      );
    }

    switch (preview.kind) {
      case 'markdown':
        return (
          <div className="markdown-preview">
            <ReactMarkdown>{preview.content}</ReactMarkdown>
          </div>
        );
      case 'text':
        return (
          <pre className="doc-preview-text">
            {preview.content}
          </pre>
        );
      case 'pdf':
        return <iframe title="PDF Preview" src={preview.content} className="doc-preview-frame" />;
      case 'image':
        return <img src={preview.content} alt={selectedDocument?.original_name} className="doc-preview-image" />;
      case 'docx':
      case 'sheet':
        return <div className="doc-preview-html" dangerouslySetInnerHTML={{ __html: preview.html }} />;
      case 'pptx':
        return (
          <div className="doc-slide-list">
            {preview.slides.length === 0 ? (
              <div className="empty-state-description">未解析到可展示的幻灯片文本。</div>
            ) : preview.slides.map((slide, index) => (
              <div key={index} className="doc-slide-card">
                <div className="doc-slide-title">Slide {index + 1}</div>
                <div className="doc-slide-text">{slide}</div>
              </div>
            ))}
          </div>
        );
      case 'error':
        return <div className="empty-state-description">{preview.error}</div>;
      case 'other':
        return <div className="empty-state-description">当前文件类型暂不支持在线预览，请使用“打开”或“下载”。</div>;
      default:
        return <div className="empty-state-description">选择左侧文档后可在这里预览。</div>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ padding: 'var(--space-16)' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">文档管理</span>
        {canManage && (
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <label className="btn btn-secondary btn-sm">
              <ImagePlus size={16} />
              选择文件
              <input
                type="file"
                multiple
                onChange={handleSelectUploadFiles}
                style={{ display: 'none' }}
              />
            </label>
            <button className="btn btn-primary btn-sm" onClick={handleUpload} disabled={uploading}>
              <RefreshCw size={16} />
              {uploading ? '上传中...' : '上传文档'}
            </button>
          </div>
        )}
      </div>

      <div className="card-body">
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

        {selectedFilePreviews.length > 0 && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ marginBottom: 'var(--space-3)', maxWidth: 320 }}>
              <label className="form-label">目标目录</label>
              <input
                className="input"
                value={targetDirectory}
                onChange={(event) => setTargetDirectory(event.target.value)}
                placeholder="留空则存入根目录，例如：方案/一期"
              />
            </div>
            <div className="form-label">待上传文件</div>
            <div className="doc-upload-list">
              {selectedFilePreviews.map((file, index) => (
                <div key={`${file.name}-${index}`} className="doc-upload-chip">
                  <span className="text-truncate" style={{ maxWidth: 240 }}>{file.name}</span>
                  <button type="button" onClick={() => removeSelectedFile(index)} title="移除文件">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {documents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><FileText size={24} /></div>
            <div className="empty-state-title">暂无文档</div>
            <div className="empty-state-description">支持上传 Markdown、PDF、Word、Excel、PowerPoint 等文件，并提供在线预览。</div>
          </div>
        ) : (
          <div className="doc-manager-layout">
            <div className="doc-sidebar">
              {groupedDocuments.map((group) => (
                <div key={group.directory} className="doc-group">
                  <button
                    className="doc-group-header"
                    onClick={() => toggleGroup(group.directory)}
                  >
                    <span>{group.directory}</span>
                    <span className="text-caption">{expandedGroups[group.directory] ? '收起' : '展开'} · {group.files.length}</span>
                  </button>
                  {expandedGroups[group.directory] && group.files.map((file) => (
                    <div
                      key={file.id}
                      role="button"
                      tabIndex={0}
                      className={`doc-sidebar-item${selectedDocumentId === file.id ? ' active' : ''}`}
                      onClick={() => setSelectedDocumentId(file.id)}
                      onKeyDown={(event) => handleDocumentKeyDown(event, file.id)}
                    >
                      <div className="doc-sidebar-item-main">
                        <div className="doc-sidebar-item-name">{file.original_name}</div>
                        <div className="doc-sidebar-item-meta">
                          {formatBytes(file.size)} · {new Date(file.modified_at).toLocaleString('zh-CN')}
                        </div>
                      </div>
                      <div className="doc-sidebar-actions">
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={(event) => event.stopPropagation()}
                          title="打开"
                        >
                          <ExternalLink size={14} />
                        </a>
                        <a
                          href={file.file_url}
                          download={file.original_name}
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={(event) => event.stopPropagation()}
                          title="下载"
                        >
                          <Download size={14} />
                        </a>
                        {canManage && (
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDelete(file.id);
                            }}
                            title="删除"
                            style={{ color: 'var(--error)' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="doc-preview-panel">
              <div className="doc-preview-header">
                <div>
                  <div className="doc-preview-title">{selectedDocument?.original_name || '在线预览'}</div>
                  <div className="text-caption">
                    {selectedDocument ? `${selectedDocument.relative_path} · ${formatBytes(selectedDocument.size)}` : '选择一个文档进行预览'}
                  </div>
                </div>
                {selectedDocument && (
                  <span className="badge badge-info">
                    <Eye size={12} />
                    {getFileKind(selectedDocument).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="doc-preview-body">
                {renderPreview()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentTab;
