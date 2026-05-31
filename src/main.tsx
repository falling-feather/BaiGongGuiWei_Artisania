import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// 注意：刻意不使用 React.StrictMode。
// StrictMode 在开发模式会双挂载组件，导致 Phaser 创建两个画布互相干扰。
ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
