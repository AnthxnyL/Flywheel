import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div className="p-8 text-center"><h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>Flywheel — En cours de construction</h1></div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
