import { useState, useMemo } from 'react'
import CodeEditor from './CodeEditor'

const TABS = [
  { id: 'code', label: 'Code' },
  { id: 'output', label: 'Output' },
  { id: 'errors', label: 'Errors' },
  { id: 'review', label: 'Review' },
]

function ResultPanel({ code, output, errors, review, readOnly, onCodeChange, fileNames = [] }) {
  const [activeTab, setActiveTab] = useState('code')
  const [activeFileIdx, setActiveFileIdx] = useState(0)

  const hasErrors = errors && errors.trim().length > 0
  const hasReview = review && Object.keys(review).length > 0

  // Build file tabs from planner file names or default to generated.py
  const files = useMemo(() => {
    if (fileNames.length > 0) return fileNames
    if (code) return ['generated.py']
    return []
  }, [fileNames, code])

  return (
    <div className="result-panel">
      <div className="result-panel__tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`result-panel__tab ${activeTab === tab.id ? 'result-panel__tab--active' : ''} ${tab.id === 'errors' && hasErrors ? 'result-panel__tab--has-errors' : ''
              }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.id === 'errors' && hasErrors && <span className="result-panel__badge">!</span>}
          </button>
        ))}
      </div>

      <div className="result-panel__content">
        {activeTab === 'code' && (
          <div className="code-view">
            {/* File sub-tabs */}
            {files.length > 0 && (
              <div className="file-tabs">
                {files.map((fname, i) => (
                  <button
                    key={i}
                    className={`file-tab ${activeFileIdx === i ? 'file-tab--active' : ''}`}
                    onClick={() => setActiveFileIdx(i)}
                  >
                    <span className="file-tab__icon">📄</span>
                    <span className="file-tab__name">{fname}</span>
                  </button>
                ))}
              </div>
            )}
            <CodeEditor code={code} readOnly={readOnly} onChange={onCodeChange} />
          </div>
        )}

        {activeTab === 'output' && (
          <div className="result-panel__output">
            {output ? (
              <pre className="result-panel__pre">{output}</pre>
            ) : (
              <p className="result-panel__empty">No output yet.</p>
            )}
          </div>
        )}

        {activeTab === 'errors' && (
          <div className="result-panel__errors">
            {hasErrors ? (
              <pre className="result-panel__pre result-panel__pre--error">{errors}</pre>
            ) : (
              <p className="result-panel__empty">No errors.</p>
            )}
          </div>
        )}

        {activeTab === 'review' && (
          <div className="result-panel__review">
            {hasReview ? (
              <div className="review-content">
                {review.verdict && (
                  <div className={`review-verdict review-verdict--${review.verdict.toLowerCase()}`}>
                    {review.verdict}
                  </div>
                )}
                {review.summary && (
                  <div className="review-section">
                    <h4>Summary</h4>
                    <p>{review.summary}</p>
                  </div>
                )}
                {review.missing && review.missing.length > 0 && (
                  <div className="review-section">
                    <h4>Missing Features</h4>
                    <ul>
                      {review.missing.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {review.suggestions && review.suggestions.length > 0 && (
                  <div className="review-section">
                    <h4>Suggestions</h4>
                    <ul>
                      {review.suggestions.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="result-panel__empty">No review yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ResultPanel
