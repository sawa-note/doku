'use client'
import { useState, useEffect } from 'react'

const STORAGE_KEY = 'doku_records'

const QUESTIONS = [
  { id: 'q1', label: '気づき', text: 'この本で一番引っかかったフレーズや場面はどこでしたか？' },
  { id: 'q2', label: 'なぜ', text: 'それはなぜ引っかかったと思いますか？' },
  { id: 'q3', label: '自分ごと化', text: 'その気づきは、あなたの日常のどんな場面と重なりますか？' },
  { id: 'q4', label: '変化', text: 'この本を読む前と後で、何か考え方が変わりましたか？' },
  { id: 'q5', label: '次の一歩', text: 'この本を読んで、明日からやってみたいことは何ですか？' },
]

export default function Home() {
  const [screen, setScreen] = useState('list')
  const [records, setRecords] = useState([])
  const [form, setForm] = useState({ title: '', author: '', date: '', publisherPerson: '', publisher: '', edition: '', synopsis: '' })
  const [answers, setAnswers] = useState({ q1: '', q2: '', q3: '', q4: '', q5: '' })
  const [currentQ, setCurrentQ] = useState(0)
  const [summary, setSummary] = useState('')
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchStatus, setSearchStatus] = useState('')
  const [detail, setDetail] = useState(null)
  const [apiKey, setApiKey] = useState('')
  const [showKeyInput, setShowKeyInput] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setRecords(JSON.parse(saved))
    const key = localStorage.getItem('doku_api_key')
    if (key) setApiKey(key)
    const today = new Date().toISOString().slice(0, 10)
    setForm(f => ({ ...f, date: today }))
  }, [])

  const saveRecords = (r) => {
    setRecords(r)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(r))
  }

  const saveApiKey = (key) => {
    setApiKey(key)
    localStorage.setItem('doku_api_key', key)
    setShowKeyInput(false)
  }

  const callClaude = async (prompt) => {
    const key = apiKey || localStorage.getItem('doku_api_key')
    if (!key) { setShowKeyInput(true); return null }
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, apiKey: key })
    })
    const data = await res.json()
    return data.text
  }

  const searchBook = async () => {
    if (!form.title) return
    setSearchStatus('検索中...')
    setLoading(true)
    try {
      const text = await callClaude(`以下の書名の書籍情報を調べてJSONで返してください。書名:「${form.title}」
返す項目: author(著者名), publisherPerson(発行者名), publisher(出版社名), edition(初版発行年月 例:2024年7月), synopsis(あらすじ200字程度)
JSON形式のみで返してください。説明不要:{"author":"","publisherPerson":"","publisher":"","edition":"","synopsis":""}`)
      if (!text) return
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error()
      const info = JSON.parse(match[0])
      setForm(f => ({ ...f, ...info }))
      setSearchStatus('自動入力しました。確認・修正してください。')
    } catch {
      setSearchStatus('取得できませんでした。手動で入力してください。')
    } finally {
      setLoading(false)
    }
  }

  const startGuide = () => {
    if (!form.title) return alert('書名を入力してください')
    setAnswers({ q1: '', q2: '', q3: '', q4: '', q5: '' })
    setCurrentQ(0)
    setScreen('guide')
  }

  const nextQ = () => {
    if (currentQ < QUESTIONS.length - 1) setCurrentQ(q => q + 1)
    else generateSummary()
  }

  const generateSummary = async () => {
    setScreen('summary')
    setLoading(true)
    setSummary('')
    setPosts([])
    const prompt = `以下は「${form.title}」(著者:${form.author})を読んだ後の読者の思考記録です。
Q1気づき:${answers.q1}
Q2なぜ:${answers.q2}
Q3自分ごと化:${answers.q3}
Q4変化:${answers.q4}
Q5次の一歩:${answers.q5}

以下の2つをJSON形式で返してください:
1. summary: この読者の思考を200字程度で深く言語化したサマリー
2. posts: Threadsに投稿できる文章3本(各150字以内、読者の思考・気づきをベースに)
{"summary":"","posts":["","",""]}のJSON形式のみで返してください。`
    try {
      const text = await callClaude(prompt)
      if (!text) return
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error()
      const data = JSON.parse(match[0])
      setSummary(data.summary || '')
      setPosts(data.posts || [])
    } catch {
      setSummary('サマリーの生成に失敗しました。手動で入力してください。')
    } finally {
      setLoading(false)
    }
  }

  const saveRecord = () => {
    const record = {
      id: Date.now(), ...form,
      answers, summary, posts,
      savedAt: new Date().toISOString()
    }
    saveRecords([record, ...records])
    setScreen('list')
    setForm({ title: '', author: '', date: new Date().toISOString().slice(0, 10), publisherPerson: '', publisher: '', edition: '', synopsis: '' })
    setSummary('')
    setPosts([])
    setSearchStatus('')
  }

  const deleteRecord = (id) => {
    if (!confirm('削除しますか？')) return
    saveRecords(records.filter(r => r.id !== id))
    setDetail(null)
    setScreen('list')
  }

  const formatDate = (d) => {
    if (!d) return ''
    const dt = new Date(d)
    if (isNaN(dt)) return d
    return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日`
  }

  const s = {
    wrap: { fontFamily: 'sans-serif', maxWidth: 600, margin: '0 auto', padding: '16px', color: '#1a1a1a' },
    header: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: '2px solid #4052A3', marginBottom: 20 },
    title: { fontSize: 18, fontWeight: 600, color: '#4052A3' },
    label: { fontSize: 11, color: '#666', marginBottom: 4, display: 'block', fontWeight: 500 },
    input: { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', fontFamily: 'sans-serif' },
    textarea: { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', fontFamily: 'sans-serif', minHeight: 80, resize: 'vertical' },
    btn: { background: '#4052A3', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%' },
    btnSub: { background: 'none', color: '#4052A3', border: '1px solid #4052A3', padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
    card: { background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '14px 16px', marginBottom: 10, cursor: 'pointer' },
    sectionLabel: { fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4052A3', margin: '20px 0 8px' },
    divider: { height: 1, background: '#E8B84B', opacity: 0.4, margin: '16px 0' },
    goldTag: { display: 'inline-block', background: '#fdf5e0', color: '#a07820', fontSize: 10, padding: '2px 8px', borderRadius: 20, border: '1px solid #E8B84B', marginTop: 6 },
    qBox: { background: '#eef0f9', borderRadius: 12, padding: '20px', marginBottom: 16 },
    progress: { display: 'flex', gap: 6, marginBottom: 20 },
    dot: (active, done) => ({ width: 8, height: 8, borderRadius: '50%', background: done ? '#4052A3' : active ? '#E8B84B' : '#ddd' }),
    summaryBox: { background: '#f8f9ff', border: '1px solid #4052A3', borderRadius: 12, padding: 16, marginBottom: 16 },
    postBox: { background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 12, marginBottom: 10, fontSize: 13, lineHeight: 1.7 },
  }

  if (showKeyInput) return (
    <div style={s.wrap}>
      <div style={s.header}><span style={s.title}>DOKU</span></div>
      <div style={s.sectionLabel}>APIキーの設定</div>
      <p style={{ fontSize: 13, color: '#666', lineHeight: 1.7 }}>AI機能を使うにはAnthropicのAPIキーが必要です。キーはこの端末にのみ保存されます。</p>
      <label style={s.label}>APIキー</label>
      <input style={s.input} type="password" placeholder="sk-ant-..." onChange={e => setApiKey(e.target.value)} />
      <div style={{ marginTop: 12 }}>
        <button style={s.btn} onClick={() => saveApiKey(apiKey)}>保存して続ける</button>
      </div>
    </div>
  )

  if (screen === 'guide') return (
    <div style={s.wrap}>
      <div style={s.header}><span style={s.title}>DOKU</span><span style={{ fontSize: 12, color: '#666', marginLeft: 'auto' }}>AI思考ガイド</span></div>
      <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>「{form.title}」</div>
      <div style={s.progress}>{QUESTIONS.map((_, i) => <div key={i} style={s.dot(i === currentQ, i < currentQ)} />)}</div>
      <div style={s.qBox}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#4052A3', marginBottom: 8 }}>Q{currentQ + 1} {QUESTIONS[currentQ].label}</div>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 16, lineHeight: 1.6 }}>{QUESTIONS[currentQ].text}</div>
        <textarea style={{ ...s.textarea, minHeight: 100 }} value={answers[QUESTIONS[currentQ].id]} onChange={e => setAnswers(a => ({ ...a, [QUESTIONS[currentQ].id]: e.target.value }))} placeholder="思ったことをそのまま書いてみてください" />
      </div>
      <button style={s.btn} onClick={nextQ}>{currentQ < QUESTIONS.length - 1 ? '次の質問へ →' : 'AIにまとめてもらう'}</button>
      <div style={{ marginTop: 10 }}><button style={s.btnSub} onClick={() => setScreen('input')}>← 書籍情報に戻る</button></div>
    </div>
  )

  if (screen === 'summary') return (
    <div style={s.wrap}>
      <div style={s.header}><span style={s.title}>DOKU</span><span style={{ fontSize: 12, color: '#666', marginLeft: 'auto' }}>思考サマリー</span></div>
      <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>「{form.title}」</div>
      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#4052A3', fontSize: 14 }}>AIが思考を整理しています...</div> : <>
        <div style={s.sectionLabel}>あなたの思考サマリー</div>
        <div style={s.summaryBox}>
          <textarea style={{ ...s.textarea, background: 'transparent', border: 'none', minHeight: 120 }} value={summary} onChange={e => setSummary(e.target.value)} />
        </div>
        <div style={s.sectionLabel}>Threads投稿ネタ（3本）</div>
        {posts.map((p, i) => <div key={i} style={s.postBox}><div style={{ fontSize: 10, color: '#4052A3', marginBottom: 6 }}>案{i + 1}</div><textarea style={{ ...s.textarea, border: 'none', minHeight: 80 }} value={p} onChange={e => setPosts(ps => ps.map((x, j) => j === i ? e.target.value : x))} /></div>)}
        <button style={s.btn} onClick={saveRecord}>この記録を保存する</button>
        <div style={{ marginTop: 10 }}><button style={s.btnSub} onClick={() => setScreen('guide')}>← 回答を修正する</button></div>
      </>}
    </div>
  )

  if (screen === 'detail' && detail) return (
    <div style={s.wrap}>
      <div style={s.header}><span style={s.title}>DOKU</span></div>
      <button style={{ ...s.btnSub, marginBottom: 16 }} onClick={() => setScreen('list')}>← 一覧に戻る</button>
      <div style={{ borderLeft: '3px solid #4052A3', paddingLeft: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{detail.title}</div>
        <div style={{ fontSize: 13, color: '#666' }}>{detail.author}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        {[['読了日', formatDate(detail.date)], ['発行会社', detail.publisher], ['初版', detail.edition]].map(([l, v]) => (
          <div key={l} style={{ background: '#f5f6fa', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: '#666' }}>{l}</div>
            <div style={{ fontSize: 12, fontWeight: 500 }}>{v || '—'}</div>
          </div>
        ))}
      </div>
      {detail.synopsis && <><div style={s.sectionLabel}>あらすじ</div><p style={{ fontSize: 13, lineHeight: 1.7 }}>{detail.synopsis}</p></>}
      <div style={s.divider} />
      <div style={s.sectionLabel}>思考サマリー</div>
      <div style={s.summaryBox}><p style={{ fontSize: 13, lineHeight: 1.7, margin: 0 }}>{detail.summary}</p></div>
      {detail.posts?.length > 0 && <><div style={s.sectionLabel}>Threads投稿ネタ</div>{detail.posts.map((p, i) => <div key={i} style={s.postBox}><div style={{ fontSize: 10, color: '#4052A3', marginBottom: 4 }}>案{i + 1}</div>{p}</div>)}</>}
      <div style={s.sectionLabel}>5つの問いへの回答</div>
      {QUESTIONS.map(q => (
        <div key={q.id} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#4052A3', fontWeight: 600 }}>{q.label}</div>
          <div style={{ fontSize: 13, lineHeight: 1.7 }}>{detail.answers?.[q.id] || '—'}</div>
        </div>
      ))}
      <div style={{ marginTop: 20 }}>
        <button style={{ ...s.btnSub, color: '#e24b4a', borderColor: '#e24b4a' }} onClick={() => deleteRecord(detail.id)}>この記録を削除する</button>
      </div>
    </div>
  )

  if (screen === 'input') return (
    <div style={s.wrap}>
      <div style={s.header}><span style={s.title}>DOKU</span><span style={{ fontSize: 12, color: '#666', marginLeft: 'auto' }}>新規記録</span></div>
      <div style={s.sectionLabel}>書籍情報</div>
      <div style={{ marginBottom: 10 }}>
        <label style={s.label}>書名</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={{ ...s.input, flex: 1 }} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} onKeyDown={e => e.key === 'Enter' && searchBook()} placeholder="タイトルを入力してEnter or 検索" />
          <button style={{ ...s.btnSub, whiteSpace: 'nowrap' }} onClick={searchBook} disabled={loading}>{loading ? '検索中...' : 'AI検索'}</button>
        </div>
        {searchStatus && <div style={{ fontSize: 11, color: '#4052A3', marginTop: 4 }}>{searchStatus}</div>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div><label style={s.label}>著者</label><input style={s.input} value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} placeholder="自動入力されます" /></div>
        <div><label style={s.label}>読了日</label><input style={s.input} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div><label style={s.label}>発行者</label><input style={s.input} value={form.publisherPerson} onChange={e => setForm(f => ({ ...f, publisherPerson: e.target.value }))} /></div>
        <div><label style={s.label}>発行会社</label><input style={s.input} value={form.publisher} onChange={e => setForm(f => ({ ...f, publisher: e.target.value }))} /></div>
        <div><label style={s.label}>初版発行</label><input style={s.input} value={form.edition} onChange={e => setForm(f => ({ ...f, edition: e.target.value }))} /></div>
      </div>
      <div style={{ marginBottom: 10 }}><label style={s.label}>あらすじ</label><textarea style={s.textarea} value={form.synopsis} onChange={e => setForm(f => ({ ...f, synopsis: e.target.value }))} placeholder="自動入力されます" /></div>
      <button style={s.btn} onClick={startGuide}>AI思考ガイドへ進む →</button>
      <div style={{ marginTop: 10 }}><button style={s.btnSub} onClick={() => setScreen('list')}>← 一覧に戻る</button></div>
    </div>
  )

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <span style={s.title}>DOKU</span>
        <span style={{ fontSize: 12, color: '#666', marginLeft: 'auto' }}>{records.length}冊記録済み</span>
        <button style={{ ...s.btnSub, fontSize: 11, padding: '4px 10px' }} onClick={() => setShowKeyInput(true)}>APIキー設定</button>
      </div>
      <button style={s.btn} onClick={() => setScreen('input')}>+ 新しい本を記録する</button>
      <div style={{ marginTop: 20 }}>
        {records.length === 0
          ? <div style={{ textAlign: 'center', padding: '40px 0', color: '#999', fontSize: 13 }}>まだ記録がありません。<br />最初の一冊を記録しよう。</div>
          : records.map(r => (
            <div key={r.id} style={s.card} onClick={() => { setDetail(r); setScreen('detail') }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{r.title}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>{r.author}</div>
                </div>
                <div style={{ fontSize: 11, color: '#999' }}>{formatDate(r.date)}</div>
              </div>
              {r.summary && <div style={{ fontSize: 12, color: '#666', marginTop: 8, borderTop: '1px solid #eee', paddingTop: 8 }}>{r.summary.slice(0, 60)}...</div>}
              <span style={s.goldTag}>読了</span>
            </div>
          ))
        }
      </div>
    </div>
  )
}
