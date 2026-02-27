import { useState, useMemo } from 'react'
import CodeEditor from './CodeEditor'

const TABS = [
  { id: 'code', label: 'Code' },
  { id: 'test_output', label: 'Test Output' },
  { id: 'output', label: 'Output' },
  { id: 'errors', label: 'Errors' },
  { id: 'review', label: 'Review' },
]

function ResultPanel({ code, output, errors, review, runResult, readOnly, onCodeChange, fileNames = [], fileContents = {} }) {
  const [activeTab, setActiveTab] = useState('code')
  const [activeFileIdx, setActiveFileIdx] = useState(0)

  const hasErrors = errors && errors.trim().length > 0
  const hasReview = review && Object.keys(review).length > 0

  // Build file tabs from planner file names or default to generated.py
  const files = useMemo(() => {
    const contentFiles = Object.keys(fileContents)
    if (fileNames.length > 0 || contentFiles.length > 0) {
      const seen = new Set()
      const merged = []
      // Prioritize files that actually have loaded content so the editor shows real code first.
      for (const name of [...contentFiles, ...fileNames]) {
        if (!seen.has(name)) {
          seen.add(name)
          merged.push(name)
        }
      }
      return merged
    }
    if (code) return ['generated.py']
    return []
  }, [fileNames, fileContents, code])

  const safeFileIdx = files.length === 0 ? 0 : Math.min(activeFileIdx, files.length - 1)
  const activeFileName = files[safeFileIdx]
  const activeFileCode = activeFileName
    ? (
      fileContents[activeFileName]
      ?? (activeFileName === 'generated.py' ? code : `# ${activeFileName}\n# Content not available yet for this file.`)
    )
    : code

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
                    type="button"
                    className={`file-tab ${safeFileIdx === i ? 'file-tab--active' : ''}`}
                    onClick={() => setActiveFileIdx(i)}
                  >
                    <span className="file-tab__icon">📄</span>
                    <span className="file-tab__name">{fname}</span>
                  </button>
                ))}
              </div>
            )}
            <CodeEditor code={activeFileCode} readOnly={readOnly} onChange={onCodeChange} />
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

        {activeTab === 'test_output' && (
          <div className="result-panel__output">
            {runResult?.tests_output || runResult?.tests_error ? (
              <pre className="result-panel__pre">{runResult?.tests_output || runResult?.tests_error}</pre>
            ) : (
              <p className="result-panel__empty">No test output yet.</p>
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
