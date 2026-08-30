import { HashRouter, Route, Routes } from 'react-router-dom'
import { Home } from './pages/Home'
import { Lesson } from './pages/Lesson'
import { Test } from './pages/Test'

// HashRouter keeps deep links working on GitHub Pages (no server rewrites).
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lesson/:slug" element={<Lesson />} />
        <Route path="/test/:id" element={<Test />} />
      </Routes>
    </HashRouter>
  )
}
