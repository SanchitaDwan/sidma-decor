// Cart state management
const Cart = {
  get: () => JSON.parse(localStorage.getItem('sidma_cart') || '[]'),
  save: (items) => localStorage.setItem('sidma_cart', JSON.stringify(items)),
  add: (product) => {
    const items = Cart.get();
    const existing = items.find(i => i.id === product.id);
    if (existing) { existing.quantity++; } 
    else { items.push({ ...product, quantity: 1 }); }
    Cart.save(items);
    Cart.updateBadge();
    Cart.openDrawer();
    Cart.renderDrawer();
  },
  remove: (id) => {
    const items = Cart.get().filter(i => i.id !== id);
    Cart.save(items);
    Cart.renderDrawer();
    Cart.updateBadge();
  },
  updateQuantity: (id, qty) => {
    const items = Cart.get();
    const item = items.find(i => i.id === id);
    if (item) { item.quantity = Math.max(1, qty); }
    Cart.save(items);
    Cart.renderDrawer();
    Cart.updateBadge();
  },
  total: () => Cart.get().reduce((sum, i) => sum + (i.price * i.quantity), 0),
  count: () => Cart.get().reduce((sum, i) => sum + i.quantity, 0),
  updateBadge: () => {
    const badges = document.querySelectorAll('.cart-count-badge');
    badges.forEach(b => { 
        b.textContent = Cart.count(); 
        b.style.display = Cart.count() ? 'flex' : 'none'; 
    });
  },
  openDrawer: () => {
    document.getElementById('cart-drawer')?.classList.remove('translate-x-full');
    document.getElementById('cart-overlay')?.classList.remove('opacity-0', 'pointer-events-none');
    document.body.style.overflow = 'hidden';
  },
  closeDrawer: () => {
    document.getElementById('cart-drawer')?.classList.add('translate-x-full');
    document.getElementById('cart-overlay')?.classList.add('opacity-0', 'pointer-events-none');
    document.body.style.overflow = '';
  },
  renderDrawer: () => {
    const items = Cart.get();
    const listEl = document.getElementById('cart-items-list');
    const subtotalEl = document.getElementById('cart-subtotal');
    const emptyEl = document.getElementById('cart-empty');
    if(!listEl || !subtotalEl || !emptyEl) return;

    const deliveryNote = Cart.total() >= 1499 ? '<span class="text-green-400 text-xs">✓ Free delivery applied</span>' : `<span class="text-accent text-xs">Add ₹${1499 - Cart.total()} more for free delivery</span>`;
    
    if (items.length === 0) {
      listEl.innerHTML = '';
      emptyEl.classList.remove('hidden');
    } else {
      emptyEl.classList.add('hidden');
      listEl.innerHTML = items.map(item => `
        <div class="flex gap-4 py-4 border-b border-[#2A2A2A]">
          <img src="${item.image}" class="w-20 h-20 object-cover rounded-xl flex-shrink-0">
          <div class="flex-1 min-w-0">
            <p class="font-medium text-sm text-[#F5F4F1] truncate">${item.name}</p>
            <p class="text-[#D4AF6A] font-medium mt-1">₹${item.price.toLocaleString('en-IN')}</p>
            <div class="flex items-center gap-3 mt-2">
              <button onclick="Cart.updateQuantity('${item.id}', ${item.quantity - 1})" class="w-7 h-7 rounded-full border border-[#2A2A2A] flex items-center justify-center text-[#9A9A9A] hover:text-[#F5F4F1] hover:border-[#D4AF6A] transition-colors">−</button>
              <span class="text-sm font-medium w-4 text-center">${item.quantity}</span>
              <button onclick="Cart.updateQuantity('${item.id}', ${item.quantity + 1})" class="w-7 h-7 rounded-full border border-[#2A2A2A] flex items-center justify-center text-[#9A9A9A] hover:text-[#F5F4F1] hover:border-[#D4AF6A] transition-colors">+</button>
              <button onclick="Cart.remove('${item.id}')" class="ml-auto text-[#5A5A5A] hover:text-red-400 transition-colors text-xs">Remove</button>
            </div>
          </div>
        </div>
      `).join('');
    }
    subtotalEl.innerHTML = `
      <div class="text-sm text-[#9A9A9A] mb-1">${deliveryNote}</div>
      <div class="flex justify-between text-[#F5F4F1] font-medium">
        <span>Subtotal</span>
        <span>₹${Cart.total().toLocaleString('en-IN')}</span>
      </div>
    `;
    lucide.createIcons();
  }
};

document.addEventListener('DOMContentLoaded', () => {
    // Init Cart
    Cart.updateBadge();
    Cart.renderDrawer();
    document.querySelectorAll('.cart-icon-btn').forEach(btn => {
        btn.addEventListener('click', Cart.openDrawer);
    });

    // Navbar scroll effect
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar?.classList.add('scrolled');
        } else {
            navbar?.classList.remove('scrolled');
        }
    });

    // Fixed mobile menu
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    let isMenuOpen = false;

    const closeMenu = () => {
        isMenuOpen = false;
        mobileMenu?.classList.add('translate-x-full');
        document.body.style.overflow = '';
        if (mobileMenuBtn) {
            mobileMenuBtn.innerHTML = '<i data-lucide="menu" class="w-5 h-5"></i>';
            lucide.createIcons();
        }
    };

    const openMenu = () => {
        isMenuOpen = true;
        mobileMenu?.classList.remove('translate-x-full');
        document.body.style.overflow = 'hidden';
        if (mobileMenuBtn) {
            mobileMenuBtn.innerHTML = '<i data-lucide="x" class="w-5 h-5"></i>';
            lucide.createIcons();
        }
    };

    mobileMenuBtn?.addEventListener('click', () => isMenuOpen ? closeMenu() : openMenu());
    mobileMenu?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

    // Reveal animation observer
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // Newsletter Handler
    document.querySelector('form[data-newsletter]')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = e.target.querySelector('input[type="email"]').value;
        if (!email) return;
        
        e.target.innerHTML = `
            <div class="flex items-center gap-3 text-[#D4AF6A] mx-auto">
                <i data-lucide="check" class="w-5 h-5"></i>
                <span class="font-medium">You're in the Glow Club! Check your inbox. ✦</span>
            </div>`;
        lucide.createIcons();
    });
});
