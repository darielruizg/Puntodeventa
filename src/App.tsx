import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { POS } from './pages/POS';
import { Inventory } from './pages/Inventory';
import { SalesHistory } from './pages/SalesHistory';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<POS />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="sales" element={<SalesHistory />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
