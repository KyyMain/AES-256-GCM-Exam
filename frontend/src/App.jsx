import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function App() {
  const [page, setPage] = useState('login') // login, register, dashboard
  const [token, setToken] = useState('')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  // Form states
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState({
    email: '',
    password: '',
    name: '',
    nik: '',
    dateOfBirth: '',
    phone: '',
    address: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvv: ''
  })

  // Data states
  const [products, setProducts] = useState([])
  const [users, setUsers] = useState([])
  const [encryptionInfo, setEncryptionInfo] = useState(null)
  const [showDecrypted, setShowDecrypted] = useState(false) // Default: show encrypted

  const isAdmin = user?.role === 'admin'

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 5000)
  }

  // Format card number with spaces
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    return parts.length ? parts.join(' ') : value
  }

  // Format expiry date
  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4)
    }
    return v
  }

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login gagal')

      setToken(data.token)
      setUser(data.user)
      setPage('dashboard')
      showMessage(`Selamat datang, ${data.user.name}!`, 'success')
    } catch (err) {
      showMessage(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Register handler
  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...registerForm,
        cardNumber: registerForm.cardNumber.replace(/\s/g, '')
      }
      const res = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registrasi gagal')

      showMessage('Registrasi berhasil! Data telah dienkripsi dengan AES-256-GCM. Silakan login.', 'success')
      setPage('login')
      setLoginForm({ email: registerForm.email, password: '' })
      setRegisterForm({
        email: '', password: '', name: '', nik: '', dateOfBirth: '',
        phone: '', address: '', cardNumber: '', cardExpiry: '', cardCvv: ''
      })
    } catch (err) {
      showMessage(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Fetch products
  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/products`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Gagal memuat produk')
      const data = await res.json()
      setProducts(data.items)
    } catch (err) {
      showMessage(err.message, 'error')
    }
  }

  // Fetch users (admin only)
  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Gagal memuat data user')
      const data = await res.json()
      setUsers(data.items)
      setEncryptionInfo(data.encryption)
    } catch (err) {
      showMessage(err.message, 'error')
    }
  }

  useEffect(() => {
    if (token && page === 'dashboard') {
      if (isAdmin) {
        fetchUsers()
      } else {
        fetchProducts()
      }
    }
  }, [token, page, isAdmin])

  const logout = () => {
    setToken('')
    setUser(null)
    setProducts([])
    setUsers([])
    setEncryptionInfo(null)
    setShowDecrypted(false)
    setPage('login')
    showMessage('Logout berhasil', 'success')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-500 blur-[150px] opacity-20" />
        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-violet-500 blur-[150px] opacity-20" />
        <div className="absolute left-1/2 bottom-0 h-72 w-72 rounded-full bg-cyan-500 blur-[150px] opacity-15" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-10">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-400">Kyystore</p>
              <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-xs font-medium">
                🔐 AES-256-GCM
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">
              {page === 'login' && 'Masuk ke Akun'}
              {page === 'register' && 'Daftar Akun Baru'}
              {page === 'dashboard' && (isAdmin ? 'Admin Dashboard' : 'Katalog Produk')}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {page === 'register' && 'Simulasi enkripsi data pelanggan untuk mata kuliah Kriptografi'}
              {page === 'dashboard' && isAdmin && 'Lihat data pelanggan terenkripsi dengan AES-256-GCM'}
            </p>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-white">{user.name}</p>
                <p className="text-xs text-slate-400">{user.email}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${isAdmin ? 'bg-violet-500/20 text-violet-300' : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                {isAdmin ? 'Admin' : 'User'}
              </span>
              <button
                onClick={logout}
                className="px-4 py-2 rounded-xl bg-white/10 text-sm text-white hover:bg-white/20 transition"
              >
                Logout
              </button>
            </div>
          )}
        </header>

        {/* Message Toast */}
        {message.text && (
          <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl transition-all max-w-md ${message.type === 'error' ? 'bg-red-500/90 text-white' :
              message.type === 'success' ? 'bg-emerald-500/90 text-white' :
                'bg-white/90 text-slate-900'
            }`}>
            {message.text}
          </div>
        )}

        {/* Login Page */}
        {page === 'login' && (
          <div className="max-w-md mx-auto">
            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <input
                    type="email"
                    required
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 transition"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                  <input
                    type="password"
                    required
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 transition"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition disabled:opacity-50"
                >
                  {loading ? 'Memproses...' : 'Masuk'}
                </button>
              </form>
              <div className="mt-6 pt-6 border-t border-white/10 text-center">
                <p className="text-sm text-slate-400">
                  Belum punya akun?{' '}
                  <button
                    onClick={() => setPage('register')}
                    className="text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    Daftar sekarang
                  </button>
                </p>
              </div>
              <div className="mt-4 p-4 rounded-xl bg-slate-800/50 text-center">
                <p className="text-xs text-slate-400 mb-2">Demo Admin Account</p>
                <p className="text-sm text-white font-mono">admin@kyystore.gg / admin1234</p>
              </div>
            </div>
          </div>
        )}

        {/* Register Page */}
        {page === 'register' && (
          <div className="max-w-2xl mx-auto">
            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
              <div className="mb-6 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🔐</span>
                  <span className="font-semibold text-violet-200">Enkripsi Data Pelanggan</span>
                </div>
                <p className="text-sm text-violet-300">
                  Semua data sensitif akan dienkripsi menggunakan <strong>AES-256-GCM</strong> dengan IV random 96-bit dan Authentication Tag 128-bit.
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-6">
                {/* Account Info */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm">1</span>
                    Informasi Akun
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Nama Lengkap</label>
                      <input
                        type="text"
                        required
                        value={registerForm.name}
                        onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none transition"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                      <input
                        type="email"
                        required
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none transition"
                        placeholder="email@example.com"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none transition"
                        placeholder="Minimal 6 karakter"
                      />
                    </div>
                  </div>
                </div>

                {/* Personal Identity */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-sm">2</span>
                    Data Pribadi
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-xs">🔒 Encrypted</span>
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        NIK (Nomor Induk Kependudukan)
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={16}
                        pattern="\d{16}"
                        value={registerForm.nik}
                        onChange={(e) => setRegisterForm({ ...registerForm, nik: e.target.value.replace(/\D/g, '').slice(0, 16) })}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:border-violet-400 focus:outline-none transition font-mono"
                        placeholder="3201234567890001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Tanggal Lahir</label>
                      <input
                        type="date"
                        required
                        value={registerForm.dateOfBirth}
                        onChange={(e) => setRegisterForm({ ...registerForm, dateOfBirth: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-violet-400 focus:outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Nomor Telepon</label>
                      <input
                        type="tel"
                        required
                        value={registerForm.phone}
                        onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:border-violet-400 focus:outline-none transition"
                        placeholder="081234567890"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Alamat Lengkap</label>
                      <input
                        type="text"
                        required
                        value={registerForm.address}
                        onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:border-violet-400 focus:outline-none transition"
                        placeholder="Jl. Contoh No. 123, Kota"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Card */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-sm">3</span>
                    Kartu Pembayaran
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs">💳 Encrypted</span>
                  </h3>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 mb-4">
                    <div className="flex justify-between items-start mb-6">
                      <div className="text-slate-400 text-xs uppercase tracking-wider">Credit Card</div>
                      <div className="flex gap-1">
                        <div className="w-8 h-5 rounded bg-red-500"></div>
                        <div className="w-8 h-5 rounded bg-amber-500 -ml-4"></div>
                      </div>
                    </div>
                    <div className="mb-4">
                      <input
                        type="text"
                        required
                        maxLength={19}
                        value={registerForm.cardNumber}
                        onChange={(e) => setRegisterForm({ ...registerForm, cardNumber: formatCardNumber(e.target.value) })}
                        className="w-full bg-transparent text-2xl font-mono text-white tracking-wider placeholder:text-slate-600 focus:outline-none"
                        placeholder="0000 0000 0000 0000"
                      />
                    </div>
                    <div className="flex justify-between">
                      <div>
                        <div className="text-slate-500 text-xs mb-1">VALID THRU</div>
                        <input
                          type="text"
                          required
                          maxLength={5}
                          value={registerForm.cardExpiry}
                          onChange={(e) => setRegisterForm({ ...registerForm, cardExpiry: formatExpiry(e.target.value) })}
                          className="bg-transparent text-white font-mono placeholder:text-slate-600 focus:outline-none w-20"
                          placeholder="MM/YY"
                        />
                      </div>
                      <div>
                        <div className="text-slate-500 text-xs mb-1">CVV</div>
                        <input
                          type="password"
                          required
                          maxLength={4}
                          value={registerForm.cardCvv}
                          onChange={(e) => setRegisterForm({ ...registerForm, cardCvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                          className="bg-transparent text-white font-mono placeholder:text-slate-600 focus:outline-none w-16 text-center"
                          placeholder="•••"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition disabled:opacity-50 text-lg"
                >
                  {loading ? 'Mengenkripsi & Menyimpan...' : '🔐 Daftar dengan Enkripsi AES-256-GCM'}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-white/10 text-center">
                <p className="text-sm text-slate-400">
                  Sudah punya akun?{' '}
                  <button
                    onClick={() => setPage('login')}
                    className="text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    Masuk
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard - User (Products) */}
        {page === 'dashboard' && !isAdmin && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-slate-400">Temukan akun game impianmu dengan harga terbaik</p>
              <button
                onClick={fetchProducts}
                className="px-4 py-2 rounded-xl border border-white/10 text-sm text-white hover:bg-white/5 transition"
              >
                Refresh
              </button>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="group rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden hover:border-emerald-500/30 transition-all hover:shadow-2xl hover:shadow-emerald-500/10"
                >
                  <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 relative overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                    />
                    <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium ${product.status === 'Available'
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-red-500/90 text-white'
                      }`}>
                      {product.status}
                    </span>
                  </div>
                  <div className="p-5">
                    <p className="text-xs font-medium text-emerald-400 mb-1">{product.game}</p>
                    <h3 className="text-lg font-semibold text-white mb-2">{product.name}</h3>
                    <p className="text-sm text-slate-400 mb-4">{product.description}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xl font-bold text-emerald-400">
                        Rp {product.price.toLocaleString('id-ID')}
                      </p>
                      <button
                        disabled={product.status === 'Sold'}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-sm font-medium text-white hover:shadow-lg hover:shadow-emerald-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {product.status === 'Sold' ? 'Terjual' : 'Beli'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dashboard - Admin (Users with Encrypted Data) */}
        {page === 'dashboard' && isAdmin && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-slate-400">Kelola data pelanggan dengan enkripsi AES-256-GCM</p>
                {encryptionInfo && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="px-2 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs">
                      {encryptionInfo.algorithm}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs">
                      IV: {encryptionInfo.iv}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs">
                      AuthTag: {encryptionInfo.authTag}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                {/* DECRYPT TOGGLE */}
                <button
                  onClick={() => setShowDecrypted(!showDecrypted)}
                  className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${showDecrypted
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                      : 'bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30'
                    }`}
                >
                  {showDecrypted ? (
                    <>🔓 Decrypted</>
                  ) : (
                    <>🔐 Encrypted</>
                  )}
                </button>
                <button
                  onClick={fetchUsers}
                  className="px-4 py-2 rounded-xl border border-white/10 text-sm text-white hover:bg-white/5 transition"
                >
                  Refresh
                </button>
              </div>
            </div>

            {/* Mode Indicator */}
            <div className={`mb-6 p-4 rounded-xl border ${showDecrypted
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-violet-500/10 border-violet-500/30'
              }`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{showDecrypted ? '🔓' : '🔐'}</span>
                <div>
                  <p className={`font-semibold ${showDecrypted ? 'text-emerald-300' : 'text-violet-300'}`}>
                    {showDecrypted ? 'Mode: Decrypted (Plain Text)' : 'Mode: Encrypted (Cipher Text)'}
                  </p>
                  <p className="text-sm text-slate-400">
                    {showDecrypted
                      ? 'Menampilkan data asli setelah dekripsi AES-256-GCM'
                      : 'Menampilkan data terenkripsi format IV:AuthTag:CipherText'}
                  </p>
                </div>
              </div>
            </div>

            {users.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-12 text-center">
                <div className="text-6xl mb-4">👤</div>
                <h3 className="text-xl font-semibold text-white mb-2">Belum Ada User Terdaftar</h3>
                <p className="text-slate-400">User yang mendaftar akan muncul di sini dengan data terenkripsi</p>
              </div>
            ) : (
              <div className="space-y-6">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 overflow-hidden"
                  >
                    {/* User Header */}
                    <div className="flex items-center gap-4 mb-6 pb-4 border-b border-white/10">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xl">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-white">{u.name}</h3>
                        <p className="text-slate-400">{u.email}</p>
                        <p className="text-xs text-slate-500">Registered: {new Date(u.createdAt).toLocaleString('id-ID')}</p>
                      </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Personal Data */}
                      <div>
                        <h4 className="text-sm font-semibold text-violet-400 mb-3 flex items-center gap-2">
                          <span>📋</span> Data Pribadi
                        </h4>
                        <div className="space-y-3">
                          <DataField
                            label="NIK"
                            data={u.personalData.nik}
                            showDecrypted={showDecrypted}
                          />
                          <DataField
                            label="Tanggal Lahir"
                            data={u.personalData.dateOfBirth}
                            showDecrypted={showDecrypted}
                          />
                          <DataField
                            label="Telepon"
                            data={u.personalData.phone}
                            showDecrypted={showDecrypted}
                          />
                          <DataField
                            label="Alamat"
                            data={u.personalData.address}
                            showDecrypted={showDecrypted}
                          />
                        </div>
                      </div>

                      {/* Payment Data */}
                      <div>
                        <h4 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                          <span>💳</span> Data Pembayaran
                        </h4>
                        <div className="space-y-3">
                          <DataField
                            label="Nomor Kartu"
                            data={u.paymentData.cardNumber}
                            showDecrypted={showDecrypted}
                          />
                          <DataField
                            label="Masa Berlaku"
                            data={u.paymentData.cardExpiry}
                            showDecrypted={showDecrypted}
                          />
                          <DataField
                            label="CVV"
                            data={u.paymentData.cardCvv}
                            showDecrypted={showDecrypted}
                            isCvv
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Component for displaying encrypted/decrypted data
function DataField({ label, data, showDecrypted, isCvv }) {
  const displayValue = showDecrypted
    ? (isCvv ? data.masked : data.decrypted)
    : data.encrypted

  return (
    <div className={`p-3 rounded-xl border ${showDecrypted
        ? 'bg-emerald-900/20 border-emerald-500/20'
        : 'bg-violet-900/20 border-violet-500/20'
      }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400">{label}</span>
        <span className={`px-2 py-0.5 rounded text-xs ${showDecrypted
            ? 'bg-emerald-500/20 text-emerald-300'
            : 'bg-violet-500/20 text-violet-300'
          }`}>
          {showDecrypted ? '🔓 Decrypted' : '🔐 Encrypted'}
        </span>
      </div>
      {showDecrypted ? (
        <p className="text-white font-medium">{displayValue}</p>
      ) : (
        <div>
          <p className="text-xs text-violet-300 font-mono break-all leading-relaxed">{displayValue}</p>
          <p className="text-xs text-slate-500 mt-1">Format: IV:AuthTag:CipherText</p>
        </div>
      )}
    </div>
  )
}

export default App
