import './App.css'
import { Chat } from './pages/chat/chat'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext'
import soviaBackground from '@/assets/background/SoVIA_full.png'

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div
          className="w-full h-screen text-gray-900 dark:text-white"
          style={{
            backgroundImage: `url(${soviaBackground})`,
            backgroundRepeat: 'repeat',
            backgroundSize: '2500px auto',
          }}
        >
          <Routes>
            <Route path="/" element={<Chat />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  )
}

export default App;
