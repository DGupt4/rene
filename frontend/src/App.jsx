import { useState, useRef, useCallback, useMemo } from 'react'
import AgentGraph from './AgentGraph'
import ResultPanel from './ResultPanel'
import { Plasma } from './Plasma'
import TrueFocus from './TrueFocus'
import StarBorder from './StarBorder'
import './App.css'

const MAX_REVISIONS = 3
const MAX_REVIEW_ITERATIONS = 2

function predictNextNode(node, nodeState) {
  if (node === 'parser') return 'planner'
  if (node === 'planner') return 'coder'
  if (node === 'coder') return 'executor'

  if (node === 'executor') {
    if (nodeState?.execution_success) return 'reviewer'
    if ((nodeState?.revision_count ?? 0) >= MAX_REVISIONS) return 'reviewer'
    return 'debugger'
  }

  if (node === 'debugger') {
    if ((nodeState?.revision_count ?? 0) >= MAX_REVISIONS) return 'reviewer'
    if (nodeState?.debug_action === 'recode') return 'coder'
    return 'executor'
  }

  if (node === 'reviewer') {
    const verdict = nodeState?.review_feedback?.verdict
    const iteration = nodeState?.review_iteration ?? 0
    if (verdict !== 'complete' && iteration < MAX_REVIEW_ITERATIONS) return 'coder'
    // Backend may route to publisher or end depending on GITHUB_TOKEN.
    return 'github_publisher'
  }

  return null
}

const NODE_ORDER = ['parser', 'planner', 'coder', 'executor', 'debugger', 'reviewer']

const SAMPLE_PDFS = [
  { name: 'Attention Is All You Need', file: '/samples/attention_is_all_you_need.pdf', description: 'Transformer architecture paper' },
  { name: 'LSTM', file: '/samples/LSTM.pdf', description: 'Long Short-Term Memory networks' },
  { name: 'ResNet', file: '/samples/ResNet.pdf', description: 'Deep residual learning paper' },
]

const TOOLBAR_ACTIONS = [
  { id: 'bold', label: 'B', style: { fontWeight: 700 }, prefix: '**', suffix: '**' },
  { id: 'sep-b-i', type: 'separator' },
  { id: 'italic', label: 'I', style: { fontStyle: 'italic' }, prefix: '*', suffix: '*' },
  { id: 'sep1', type: 'separator' },
  { id: 'bullet', label: '\u2022', prefix: '\n- ', suffix: '' },
  { id: 'sep-bu-nu', type: 'separator' },
  { id: 'number', label: '1.', prefix: '\n1. ', suffix: '' },
  { id: 'sep2', type: 'separator' },
  { id: 'heading', label: 'H', style: { fontSize: '0.75rem', fontWeight: 700 }, prefix: '\n## ', suffix: '' },
]

function App() {
  const [password, setPassword] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [file, setFile] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [activeNode, setActiveNode] = useState(null)
  const [completedNodes, setCompletedNodes] = useState([])
  const [nodeData, setNodeData] = useState({})
  const [code, setCode] = useState('')
  const [fileContents, setFileContents] = useState({})
  const [output, setOutput] = useState('')
  const [errors, setErrors] = useState('')
  const [review, setReview] = useState(null)
  const [runResult, setRunResult] = useState(null)
  const [hasRun, setHasRun] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const inputRef = useRef()
  const textareaRef = useRef()

  const pdfUrl = useMemo(() => {
    if (!file) return null
    return URL.createObjectURL(file)
  }, [file])

  const displayFileNames = useMemo(() => {
    const generated = Object.keys(fileContents || {})
    if (generated.length > 0) return generated
    return (
      nodeData.planner?.implementation_plan?.files ||
      nodeData.planner?.files ||
      []
    )
  }, [fileContents, nodeData.planner])

  const loadSamplePdf = useCallback(async (sample) => {
    try {
      const res = await fetch(sample.file)
      const blob = await res.blob()
      const f = new File([blob], sample.name + '.pdf', { type: 'application/pdf' })
      setFile(f)
    } catch {
      const blob = new Blob(['sample'], { type: 'application/pdf' })
      const f = new File([blob], sample.name + '.pdf', { type: 'application/pdf' })
      setFile(f)
    }
  }, [])

  const insertFormatting = useCallback((prefix, suffix) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = prompt.slice(start, end)
    const before = prompt.slice(0, start)
    const after = prompt.slice(end)
    const inserted = prefix + selected + suffix
    setPrompt(before + inserted + after)
    requestAnimationFrame(() => {
      ta.focus()
      const cursorPos = start + prefix.length + selected.length
      ta.setSelectionRange(cursorPos, cursorPos)
    })
  }, [prompt])

  // ═══════════════════════════════════════════
  //  PAGE 1: Password Gate
  // ═══════════════════════════════════════════
  if (!unlocked) {
    return (
      <div className="page-wrap">
        <Plasma opacity={0.45} speed={0.6} />
        <div className="center-stage">
          <StarBorder as="div" color="#818cf8" speed="6s" thickness={2} className="lock-card-border">
            <div className="lock-card">
              <div className="lock-card__glow" />
              <img
                src="https://i0.wp.com/againstprofphil.org/wp-content/uploads/APP_descartes_with_cool_shades_sept17.jpg?w=400&ssl=1"
                alt="Descartes"
                className="lock-card__avatar"
              />
              <TrueFocus
                sentence="descartes"
                manualMode={false}
                blurAmount={4}
                borderColor="#818cf8"
                glowColor="rgba(129, 140, 248, 0.4)"
                animationDuration={0.6}
                pauseBetweenAnimations={1.5}
              />
              <p className="brand-sub">AI-Powered Paper to Code</p>
              <form className="lock-form" onSubmit={(e) => { e.preventDefault(); if (password === 'Dhruv') setUnlocked(true) }}>
                <div className="lock-input-wrap">
                  <input
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="lock-input"
                  />
                </div>
                <button type="submit" className="btn-neon">Unlock</button>
              </form>
            </div>
          </StarBorder>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════
  //  Shared: Streaming handler
  // ═══════════════════════════════════════════
  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setHasRun(true)
    setError(null)
    setActiveNode(null)
    setCompletedNodes([])
    setNodeData({})
    setCode('')
    setFileContents({})
    setOutput('')
    setErrors('')
    setReview(null)
    setRunResult(null)

    const form = new FormData()
    form.append('file', file)
    form.append('prompt', prompt || ' ')
    form.append('password', password)

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}/generate`, {
        method: 'POST',
        body: form,
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      setActiveNode('parser')
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        let eventType = null
        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim()
          } else if (line.startsWith('data:') && eventType === 'agent') {
            const data = JSON.parse(line.slice(5).trim())
            if (data.node === 'done') {
              setActiveNode(null)
              const r = data.data
              if (r) {
                if (r.generated_code) setCode(r.generated_code)
                if (r.generated_files) setFileContents(r.generated_files)
                if (r.execution_output) setOutput(r.execution_output)
                if (r.execution_error) setErrors(r.execution_error)
                if (r.review_feedback) setReview(r.review_feedback)
                if (r.run_result) setRunResult(r.run_result)
              }
            } else {
              setNodeData((prev) => ({ ...prev, [data.node]: data.data }))
              const d = data.data
              if (data.node === 'coder' && d?.generated_code) {
                setCode(d.generated_code)
                setFileContents((prev) => ({ ...prev, 'method.py': d.generated_code }))
              }
              if (data.node === 'debugger' && d?.generated_code) {
                setCode(d.generated_code)
                setFileContents((prev) => ({ ...prev, 'method.py': d.generated_code }))
              }
              if (data.node === 'executor') {
                if (d?.generated_files) setFileContents(d.generated_files)
                if (d?.execution_output) setOutput(d.execution_output)
                if (d?.execution_error) setErrors(d.execution_error)
                if (d?.run_result) setRunResult(d.run_result)
              }
              if (data.node === 'reviewer' && d?.review_feedback) setReview(d.review_feedback)

              // Mark this node as completed
              setCompletedNodes((prev) => {
                if (prev.includes(data.node)) return prev
                return [...prev, data.node]
              })

              // Use predictNextNode for smart next-node prediction (handles loops)
              const nextNode = predictNextNode(data.node, d)
              if (nextNode) {
                setActiveNode(nextNode)
                // If we're looping back (e.g., debugger→coder), remove
                // the next node from completed so it shows as active again
                setCompletedNodes((prev) => prev.filter((n) => n !== nextNode))
              }
            }
            eventType = null
          }
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setActiveNode(null)
    }
  }

  // ═══════════════════════════════════════════
  //  Helper: Parse the sections from parser data
  // ═══════════════════════════════════════════
  const getParsedSections = (parserData) => {
    if (!parserData) return null
    if (typeof parserData === 'string') {
      try {
        const parsed = JSON.parse(parserData)
        return parsed.parsed_sections || parsed
      } catch {
        return null
      }
    }
    return parserData.parsed_sections || parserData
  }

  // ═══════════════════════════════════════════
  //  Helper: Get planner data
  // ═══════════════════════════════════════════
  const getPlanData = (plannerData) => {
    if (!plannerData) return null
    if (typeof plannerData === 'string') {
      try { return JSON.parse(plannerData) } catch { return null }
    }
    return plannerData.implementation_plan || plannerData
  }

  // ═══════════════════════════════════════════
  //  Render: Extracted Content (accordions + pills)
  // ═══════════════════════════════════════════
  const renderExtractedContent = (parserData) => {
    const sections = getParsedSections(parserData)
    if (!sections) return null

    return (
      <div className="ex-content">
        {/* Abstract — Accordion (open by default) */}
        {sections.abstract && (
          <details className="accordion" open>
            <summary className="accordion__trigger">
              <span className="accordion__icon">▸</span>
              <span className="accordion__label">Abstract</span>
            </summary>
            <div className="accordion__body">
              <p className="ex-text">{sections.abstract}</p>
            </div>
          </details>
        )}

        {/* Methodology — Accordion (closed by default) */}
        {sections.methodology && (
          <details className="accordion">
            <summary className="accordion__trigger">
              <span className="accordion__icon">▸</span>
              <span className="accordion__label">Methodology</span>
            </summary>
            <div className="accordion__body">
              <p className="ex-text">{sections.methodology}</p>
            </div>
          </details>
        )}

        {/* Algorithms — Pill array */}
        {sections.algorithms && sections.algorithms.length > 0 && (
          <div className="pill-section">
            <span className="pill-section__label">Algorithms</span>
            <div className="pill-array">
              {sections.algorithms.map((algo, i) => (
                <span key={i} className="pill pill--algo">{algo}</span>
              ))}
            </div>
          </div>
        )}

        {/* Libraries — Pill array */}
        {sections.libraries && sections.libraries.length > 0 && (
          <div className="pill-section">
            <span className="pill-section__label">Libraries</span>
            <div className="pill-array">
              {sections.libraries.map((lib, i) => (
                <span key={i} className="pill pill--lib">{lib}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════
  //  Render: Plan (callout + tree + notes)
  // ═══════════════════════════════════════════
  const renderPlan = (plannerData) => {
    const plan = getPlanData(plannerData)
    if (!plan) {
      // Fallback for unexpected shapes
      const raw = typeof plannerData === 'string' ? plannerData : JSON.stringify(plannerData, null, 2)
      return <pre className="mono-text">{raw}</pre>
    }

    const status = plannerData.status || nodeData.parser?.status || 'planned'

    return (
      <div className="plan-dash">
        {/* Status badge */}
        <div className={`plan-status plan-status--${status}`}>
          <span className="plan-status__dot" />
          <span className="plan-status__text">
            {status === 'planned' ? 'Planned' : status === 'processing' ? 'Processing' : status}
          </span>
        </div>

        {/* Overview callout */}
        {plan.overview && (
          <div className="plan-callout">
            <div className="plan-callout__icon">ℹ️</div>
            <p className="plan-callout__text">{plan.overview}</p>
          </div>
        )}

        {/* Architecture tree */}
        {plan.files && plan.files.length > 0 && (
          <div className="arch-tree">
            <h5 className="arch-tree__heading">Architecture</h5>
            {plan.files.map((file, fi) => (
              <div key={fi} className="arch-node">
                <div className="arch-node__file">
                  <span className="arch-node__file-icon">📄</span>
                  <span className="arch-node__file-name">{file}</span>
                  {/* Dep tags inline */}
                  {plan.libraries && plan.libraries.length > 0 && fi === 0 && (
                    <div className="arch-node__deps">
                      {plan.libraries.map((lib, li) => (
                        <span key={li} className="dep-tag">{lib}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Classes as sub-items */}
                {plan.classes && plan.classes.length > 0 && (
                  <div className="arch-branch">
                    <span className="arch-branch__label">🧩 Classes</span>
                    <div className="arch-leaves">
                      {plan.classes.map((cls, ci) => {
                        const parts = cls.split(' - ')
                        return (
                          <div key={ci} className="arch-leaf">
                            <span className="arch-leaf__name">{parts[0]}</span>
                            {parts[1] && <span className="arch-leaf__desc">{parts[1]}</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Functions as sub-items */}
                {plan.functions && plan.functions.length > 0 && (
                  <div className="arch-branch">
                    <span className="arch-branch__label">⚡ Functions</span>
                    <div className="arch-leaves">
                      {plan.functions.map((fn, fni) => {
                        const parts = fn.split(' - ')
                        return (
                          <div key={fni} className="arch-leaf">
                            <span className="arch-leaf__name">{parts[0]}</span>
                            {parts[1] && <span className="arch-leaf__desc">{parts[1]}</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Implementation notes — alert box */}
        {plan.implementation_notes && (
          <div className="plan-alert">
            <div className="plan-alert__header">
              <span className="plan-alert__icon">⚠️</span>
              <span className="plan-alert__title">Implementation Notes</span>
            </div>
            <p className="plan-alert__body">{plan.implementation_notes}</p>
          </div>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════
  //  PAGE 2: Upload — No file yet
  // ═══════════════════════════════════════════
  if (!hasRun) {
    if (!file) {
      return (
        <div className="page-wrap">
          <Plasma opacity={0.45} speed={0.6} />
          <div className="center-stage">
            <div className="upload-hero">
              <TrueFocus
                sentence="descartes"
                manualMode={false}
                blurAmount={4}
                borderColor="#818cf8"
                glowColor="rgba(129, 140, 248, 0.4)"
                animationDuration={0.6}
                pauseBetweenAnimations={1.5}
              />
              <p className="brand-sub">Drop your research paper and watch it transform into code</p>

              <div
                className={`drop-zone ${dragging ? 'drop-zone--active' : ''}`}
                onClick={() => inputRef.current.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                <div className="drop-zone__icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="12" y2="12" />
                    <line x1="15" y1="15" x2="12" y2="12" />
                  </svg>
                </div>
                <span className="drop-zone__label">Drop a PDF here or click to browse</span>
                <span className="drop-zone__hint">.pdf files only</span>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => setFile(e.target.files[0])}
                />
              </div>

              <div className="sample-row">
                <span className="sample-row__label">Try a sample</span>
                <div className="sample-row__items">
                  {SAMPLE_PDFS.map((sample) => (
                    <button
                      key={sample.name}
                      type="button"
                      className="sample-chip"
                      onClick={() => loadSamplePdf(sample)}
                    >
                      <span className="sample-chip__dot" />
                      {sample.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // ═══════════════════════════════════════════
    //  PAGE 3: File selected — Configure & Preview
    // ═══════════════════════════════════════════
    return (
      <div className="page-wrap">
        <Plasma opacity={0.35} speed={0.5} />
        <div className="config-layout">
          <div className="config-sidebar">
            <h2 className="brand-title brand-title--sm">descartes</h2>

            <div className="config-file-badge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span>{file.name}</span>
              <button className="config-file-badge__change" onClick={() => setFile(null)}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="config-prompt">
                <div className="config-prompt__toolbar">
                  {TOOLBAR_ACTIONS.map((action) =>
                    action.type === 'separator' ? (
                      <div key={action.id} className="toolbar-sep" />
                    ) : (
                      <button
                        key={action.id}
                        type="button"
                        className="toolbar-btn"
                        style={action.style}
                        title={action.id}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          insertFormatting(action.prefix, action.suffix)
                        }}
                      >
                        {action.label}
                      </button>
                    )
                  )}
                </div>
                <textarea
                  ref={textareaRef}
                  placeholder="Add additional info (optional)"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={5}
                  className="config-prompt__textarea"
                />
              </div>
              <button className="btn-neon btn-neon--wide" type="submit" disabled={loading}>
                Initialize Pipeline
              </button>
            </form>
          </div>

          <div className="config-preview">
            {pdfUrl && (
              <iframe
                src={pdfUrl}
                title="PDF Preview"
                className="config-preview__iframe"
              />
            )}
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════
  //  PAGE 4: Studio — Running / Results
  // ═══════════════════════════════════════════

  const renderAgentProgress = () => (
    <div className="agent-rail">
      {NODE_ORDER.map((node, i) => {
        const done = completedNodes.includes(node)
        const active = activeNode === node
        return (
          <div key={node} className="agent-rail__node-wrap">
            <div className={`agent-rail__node ${done ? 'agent-rail__node--done' : ''} ${active ? 'agent-rail__node--active' : ''}`}>
              <div className="agent-rail__indicator">
                {done ? '✓' : active ? <span className="agent-rail__ping" /> : (i + 1)}
              </div>
              <span className="agent-rail__name">{node}</span>
            </div>
            {i < NODE_ORDER.length - 1 && (
              <div className={`agent-rail__connector ${done ? 'agent-rail__connector--done' : ''}`} />
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="page-wrap">
      <Plasma opacity={0.35} speed={0.5} />

      {/* ── Top Bar ── */}
      <header className="topbar">
        <div className="topbar__brand">
          <h1 className="brand-title brand-title--sm">descartes</h1>
          <div className="topbar__file-chip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
            <span>{file?.name}</span>
          </div>
        </div>
        <div className="topbar__progress">
          {renderAgentProgress()}
        </div>
        <div className="topbar__status-area">
          {loading && (
            <div className="status-pill status-pill--processing">
              <span className="status-pill__dot" />
              Processing
            </div>
          )}
          {!loading && completedNodes.length > 0 && (
            <div className="status-pill status-pill--done">✓ Done</div>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="studio-body">

        {/* ── Left Drawer — Premium Insights ── */}
        <aside className={`drawer ${sidebarOpen ? 'drawer--open' : 'drawer--closed'}`}>
          <div className="drawer__inner custom-scrollbar">
            <div className="drawer__head">
              <h3 className="drawer__title">Insights</h3>
              <button type="button" className="drawer__close" onClick={() => setSidebarOpen(false)}>✕</button>
            </div>

            {prompt && (
              <div className="insight-card insight-card--accent">
                <div className="insight-card__label">Your Prompt</div>
                <p className="insight-card__body">{prompt}</p>
              </div>
            )}

            {nodeData.parser && (
              <div className="sidebar-section">
                <h4 className="sidebar-section__heading sticky-heading">📖 Extracted Content</h4>
                {renderExtractedContent(nodeData.parser)}
              </div>
            )}

            {nodeData.planner && (
              <div className="sidebar-section">
                <h4 className="sidebar-section__heading sticky-heading">🗺️ Plan</h4>
                {renderPlan(nodeData.planner)}
              </div>
            )}
          </div>
        </aside>

        {!sidebarOpen && (
          <button type="button" className="drawer-toggle" onClick={() => setSidebarOpen(true)} title="Show insights">☰</button>
        )}

        {/* ── Main: Results ── */}
        <main className="studio-main">
          {error && <div className="error-bar">{error}</div>}
          <div className="result-wrap">
            <ResultPanel
              code={code}
              output={output}
              errors={errors}
              review={review}
              runResult={runResult}
              readOnly={loading}
              onCodeChange={setCode}
              fileContents={fileContents}
              fileNames={displayFileNames}
            />
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
