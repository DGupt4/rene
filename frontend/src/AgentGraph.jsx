const NODES = [
  { id: 'parser', label: 'Parser' },
  { id: 'planner', label: 'Planner' },
  { id: 'coder', label: 'Coder' },
  { id: 'executor', label: 'Executor' },
  { id: 'debugger', label: 'Debugger' },
  { id: 'reviewer', label: 'Reviewer' },
  { id: 'github_publisher', label: 'Publisher' },
]

function DownArrow() {
  return (
    <div className="graph-edge">
      <svg width="16" height="20" viewBox="0 0 16 20">
        <line x1="8" y1="0" x2="8" y2="14" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
        <polygon points="4,13 8,19 12,13" fill="rgba(255,255,255,0.2)" />
      </svg>
    </div>
  )
}

function AgentGraph({ activeNode, completedNodes }) {
  const completed = new Set(completedNodes)

  const getStatus = (id) => {
    if (activeNode === id) return 'active'
    if (completed.has(id)) return 'completed'
    return 'pending'
  }

  return (
    <div className="agent-graph">
      <div className="agent-graph__flow">
        {NODES.map((node, i) => {
          const status = getStatus(node.id)
          const showLoop = node.id === 'executor'
          return (
            <div key={node.id} className="agent-graph__step">
              <div className={`graph-node graph-node--${status}`}>
                <span className="graph-node__label">{node.label}</span>
                {status === 'completed' && <span className="graph-node__check">&#10003;</span>}
                {status === 'active' && <span className="graph-node__dot" />}
              </div>

              {showLoop && (
               <div className="graph-loop">
                 <svg width="140" height="48" viewBox="0 0 140 48">
                   {/* Down arrow from executor */}
                   <line x1="70" y1="0" x2="70" y2="8" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                   {/* Retry box */}
                   <rect x="30" y="8" width="80" height="24" rx="4" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeDasharray="4 3" />
                   <text x="70" y="24" textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-sans)">retry loop</text>
                   {/* Down arrow out */}
                   <line x1="70" y1="32" x2="70" y2="42" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                   <polygon points="66,40 70,47 74,40" fill="rgba(255,255,255,0.2)" />
                 </svg>
               </div>
             )}

              {i < NODES.length - 1 && !showLoop && (
                <DownArrow />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AgentGraph
