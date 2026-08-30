import { HashRouter, Route, Routes } from 'react-router-dom'
import { Home } from './pages/Home'
import { Journal } from './pages/Journal'
import { JournalEdit } from './pages/JournalEdit'
import { JournalGame } from './pages/JournalGame'
import { Lesson } from './pages/Lesson'
import { Review } from './pages/Review'
import { Settings } from './pages/Settings'
import { Test } from './pages/Test'

// HashRouter keeps deep links working on GitHub Pages (no server rewrites).
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lesson/:slug" element={<Lesson />} />
        <Route path="/test/:id" element={<Test />} />
        <Route path="/review" element={<Review />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/journal/new" element={<JournalEdit />} />
        <Route path="/journal/:id" element={<JournalGame />} />
        <Route path="/journal/:id/edit" element={<JournalEdit />} />
      </Routes>
    </HashRouter>
  )
}
