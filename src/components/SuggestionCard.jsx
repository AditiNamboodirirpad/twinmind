const TYPE_STYLES = {
  'ANSWER':          { badge: 'text-[#4ade80]', bg: 'rgba(74,222,128,.15)' },
  'QUESTION TO ASK': { badge: 'text-[#6ea8fe]', bg: 'rgba(110,168,254,.15)' },
  'TALKING POINT':   { badge: 'text-[#b388ff]', bg: 'rgba(179,136,255,.15)' },
  'FACT CHECK':      { badge: 'text-[#fbbf24]', bg: 'rgba(251,191,36,.15)' },
}

export function SuggestionCard({ card, onClick, fresh }) {
  const styles = TYPE_STYLES[card.type] ?? TYPE_STYLES['TALKING POINT']
  return (
    <button
      onClick={() => onClick(card)}
      style={{
        width: '100%',
        textAlign: 'left',
        background: '#1d212a',
        border: `1px solid ${fresh ? '#6ea8fe' : '#272c38'}`,
        borderRadius: 8,
        padding: '12px',
        cursor: 'pointer',
        transition: 'border-color .15s, transform .15s',
        display: 'block',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#6ea8fe'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = fresh ? '#6ea8fe' : '#272c38'
        e.currentTarget.style.transform = 'none'
      }}
    >
      <div style={{ marginBottom: 6 }}>
        <span style={{
          display: 'inline-block',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: 1,
          padding: '2px 6px',
          borderRadius: 4,
          background: styles.bg,
          marginBottom: 6,
        }} className={styles.badge}>
          {card.type}
        </span>
      </div>
      <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4, color: '#e7e9ee', margin: 0 }}>
        {card.preview}
      </p>
    </button>
  )
}
