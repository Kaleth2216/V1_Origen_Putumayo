import React, { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import NavbarLayout from "./components/common/NavbarLayout";
import FooterLayout from "./components/common/FooterLayout";

import Home from "./pages/public/Home";
import History from "./pages/public/History";
import Products from "./pages/public/Products";
import CheckoutPage from "./pages/public/checkout/CheckoutPage";
import Login from "./pages/public/Login";
import ProductDetail from "./pages/public/ProductDetail";
import Contacto from "./pages/public/Contacto";
import DebugPage from "./pages/public/DebugPage";

import { CartProvider } from "./features/cart/CartContext";
import CartDrawer from "./features/cart/CartDrawer";
import CartSuccess from "./features/cart/CartSuccess";

import { AuthProvider } from "./context/AuthContext";

import AdminRoute from "./components/common/AdminRoute";
import AdminDashboard from "./pages/admin/AdminDashboard";

const App: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <AuthProvider>
      <CartProvider>
        <NavbarLayout>
          <FooterLayout>
            <CartDrawer />
            <CartSuccess />

            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/contacto" element={<Contacto />} />
              <Route path="/historia" element={<History />} />
              <Route path="/productos" element={<Products />} />
              <Route path="/productos/:slug" element={<ProductDetail />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/debug" element={<DebugPage />} />

              {/* Admin Route */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
            </Routes>
          </FooterLayout>
        </NavbarLayout>
      </CartProvider>
    </AuthProvider>
  );
};

export default App;