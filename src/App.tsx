import './App.css'
import { Chat } from './pages/chat/chat'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext'
import background from '@/assets/background/KIVeSS_large.svg'

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div
          className="relative w-full h-screen text-gray-900 dark:text-white"
          style={{
            backgroundImage: `url(${background})`,
            backgroundRepeat: 'repeat',
            backgroundSize: '300px auto',
          }}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 via-white/20 to-black/5 dark:from-black/20 dark:via-black/5 dark:to-black/50" />
          <div className="relative z-10 h-full">
            <Routes>
              <Route path="/" element={<Chat />} />
            </Routes>
          </div>
        </div>
      </Router>
    </ThemeProvider>
  )
}

export default App;
