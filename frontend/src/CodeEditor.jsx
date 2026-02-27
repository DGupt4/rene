import { useEffect, useRef, useCallback } from 'react'
import { EditorView, lineNumbers, keymap } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { python } from '@codemirror/lang-python'
import { defaultKeymap } from '@codemirror/commands'
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language'
import { tags } from '@lezer/highlight'

const highlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#fca5a5' }, // light red/pink for keywords
  { tag: tags.controlKeyword, color: '#fca5a5' },
  { tag: tags.definition(tags.variableName), color: '#93c5fd' }, // light blue for definitions
  { tag: tags.variableName, color: '#f3f4f6' }, // near white for variables
  { tag: tags.function(tags.variableName), color: '#93c5fd' },
  { tag: tags.definition(tags.function(tags.variableName)), color: '#93c5fd' },
  { tag: tags.string, color: '#a7f3d0' }, // mint green for strings
  { tag: tags.number, color: '#fde047' }, // yellow for numbers
  { tag: tags.bool, color: '#fde047' },
  { tag: tags.null, color: '#fde047' },
  { tag: tags.comment, color: '#6b7280', fontStyle: 'italic' }, // gray for comments
  { tag: tags.operator, color: '#fca5a5' },
  { tag: tags.punctuation, color: '#9ca3af' },
  { tag: tags.bracket, color: '#9ca3af' },
  { tag: tags.className, color: '#c4b5fd' }, // purple for classes
  { tag: tags.typeName, color: '#c4b5fd' },
  { tag: tags.propertyName, color: '#f3f4f6' },
  { tag: tags.attributeName, color: '#93c5fd' },
  { tag: tags.self, color: '#fca5a5' },
  { tag: tags.special(tags.variableName), color: '#fca5a5' },
])

const darkTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: "var(--font-mono)",
    borderRadius: '8px',
    border: 'none',
  },
  '.cm-content': {
    padding: '16px 0',
    caretColor: 'var(--text-primary)',
  },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    border: 'none',
    borderRight: '1px solid var(--border-light)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'rgba(59, 130, 246, 0.3) !important',
  },
  '.cm-cursor': {
    borderLeftColor: 'var(--text-primary)',
  },
  '.cm-line': {
    padding: '0 16px',
  },
})

function CodeEditor({ code, readOnly = false, onChange }) {
  const containerRef = useRef(null)
  const viewRef = useRef(null)
  const codeRef = useRef(code)
  codeRef.current = code

  useEffect(() => {
    if (!containerRef.current) return

    const state = EditorState.create({
      doc: codeRef.current || '',
      extensions: [
        lineNumbers(),
        python(),
        syntaxHighlighting(highlightStyle),
        darkTheme,
        keymap.of(defaultKeymap),
        EditorView.lineWrapping,
        EditorState.readOnly.of(readOnly),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && onChange) {
            onChange(update.state.doc.toString())
          }
        }),
      ],
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [readOnly])

  // Update doc content when code prop changes externally
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (code !== current) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: code || '' },
      })
    }
  }, [code])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code || '')
  }, [code])

  const handleDownload = useCallback(() => {
    const blob = new Blob([code || ''], { type: 'text/x-python' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'generated.py'
    a.click()
    URL.revokeObjectURL(url)
  }, [code])

  return (
    <div className="code-editor">
      <div className="code-editor__toolbar">
        <div className="code-editor__actions">
          <button className="btn-icon" onClick={handleCopy} title="Copy code">
            Copy
          </button>
          <button className="btn-icon" onClick={handleDownload} title="Download .py file">
            Download
          </button>
        </div>
      </div>
      <div ref={containerRef} className="code-editor__container" />
    </div>
  )
}

export default CodeEditor
