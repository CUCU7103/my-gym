// src/components/settings/SettingsPage.tsx
import { useAppContext } from '../../context/AppContext'
import { GoalStepper } from './GoalStepper'
import { ResetDataButton } from './ResetDataButton'

// 설정 그룹 카드 공통 스타일
const groupStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid #222',
  borderRadius: '14px',
  overflow: 'hidden',
}

// 그룹 레이블(소제목) 공통 스타일
const groupLabelStyle: React.CSSProperties = {
  fontSize: '10px', color: 'var(--text-muted)',
  padding: '10px 14px 4px', textTransform: 'uppercase', letterSpacing: '0.8px',
}

// 설정 행 공통 스타일
const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '12px 14px', borderTop: '1px solid var(--border-subtle)',
}

/** 설정 화면 — 주간 목표 스테퍼, 데이터 정보, 데이터 초기화 기능 제공 */
export function SettingsPage() {
  const { settings, updateWeeklyGoal, stats, deleteAllRecords } = useAppContext()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '16px' }}>
      <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>설정</h1>

      {/* 목표 그룹 */}
      <div style={groupStyle}>
        <div style={groupLabelStyle}>목표</div>
        <div style={rowStyle}>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text)' }}>주간 운동 목표</p>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>이번 주 달성 현황에 반영됩니다</p>
          </div>
          {/* 주간 목표 스테퍼 — 1~7회 설정 */}
          <GoalStepper value={settings.weeklyGoal} onChange={updateWeeklyGoal} />
        </div>
      </div>

      {/* 데이터 그룹 */}
      <div style={groupStyle}>
        <div style={groupLabelStyle}>데이터</div>
        <div style={rowStyle}>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text)' }}>저장 방식</p>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>이 기기 로컬에만 저장됩니다</p>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>로컬</span>
        </div>
        <div style={rowStyle}>
          <p style={{ fontSize: '13px', color: 'var(--text)' }}>총 기록 수</p>
          <span style={{ fontSize: '13px', color: 'var(--blue)', fontWeight: 600 }}>{stats.totalCount}회</span>
        </div>
      </div>

      {/* 로컬 저장 안내 박스 */}
      <div style={{
        background: 'var(--surface-deep)', border: '1px solid var(--border-subtle)',
        borderRadius: '12px', padding: '12px 14px',
      }}>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          기록은 이 기기의 브라우저에만 저장됩니다. 브라우저 데이터를 삭제하거나 기기를 변경하면 기록이 사라질 수 있습니다.
        </p>
      </div>

      {/* 앱 정보 그룹 */}
      <div style={groupStyle}>
        <div style={groupLabelStyle}>앱 정보</div>
        <div style={rowStyle}>
          <p style={{ fontSize: '13px', color: 'var(--text)' }}>버전</p>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>1.0.0</span>
        </div>
      </div>

      {/* 데이터 초기화 버튼 — 확인 모달 포함 */}
      <ResetDataButton onReset={deleteAllRecords} />

      <p style={{ textAlign: 'center', fontSize: '10px', color: '#2a2a2a', paddingBottom: '4px' }}>
        my-gym · 로컬 저장
      </p>
    </div>
  )
}
