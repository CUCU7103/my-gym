// src/components/records/FilterChips.tsx

export type FilterType = 'all' | 'month' | 'week'

type FilterChipsProps = {
  active: FilterType
  onChange: (f: FilterType) => void
}

// 필터 목록 정의 (전체 / 이번 달 / 이번 주)
const FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all',   label: '전체' },
  { id: 'month', label: '이번 달' },
  { id: 'week',  label: '이번 주' },
]

/** 기록 목록 필터링용 칩 버튼 그룹 */
export function FilterChips({ active, onChange }: FilterChipsProps) {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {FILTERS.map(f => (
        <button
          key={f.id}
          type="button"
          onClick={() => onChange(f.id)}
          style={{
            padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
            cursor: 'pointer',
            // 활성 필터는 파란색 계열, 비활성은 기본 surface 색상 적용
            background: active === f.id ? 'var(--blue-tint)' : 'var(--surface)',
            border: `1px solid ${active === f.id ? 'var(--blue)' : 'var(--border)'}`,
            color: active === f.id ? 'var(--blue)' : 'var(--text-muted)',
          }}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
