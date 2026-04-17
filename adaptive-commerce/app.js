/**
 * Adaptive Smart Commerce System
 * Core Application Logic & Mock Real-time Engine
 */

// --- MOCK DATABASE (State) ---
const DB = {
    shops: [],
    products: [],
    orders: [],
    drivers: [],
    cart: {
        shopId: null,
        items: []
    },
    userLocation: { lat: 13.0827, lng: 80.2707 } // Chennai approx
};

// --- CONFIG ---
const CONFIG = {
    avgDriverSpeedMpm: 400, // meters per minute (approx 24 km/h in city traffic)
    basePrepTimePerItem: 3, // minutes per item
};

// --- DATA SEEDING ---
function seedData() {
    // Shops
    DB.shops = [
        { id: 's1', name: 'FreshMart Adayar', location: { lat: 13.0012, lng: 80.2565 }, avg_prep_time_per_item: 2, current_load: 5, image: '🛒' },
        { id: 's2', name: 'SuperGrocery T-Nagar', location: { lat: 13.0396, lng: 80.2335 }, avg_prep_time_per_item: 3, current_load: 25, image: '🥩' },
        { id: 's3', name: 'DailyNeeds Velachery', location: { lat: 12.9815, lng: 80.2180 }, avg_prep_time_per_item: 2.5, current_load: 2, image: '🥦' },
        { id: 's4', name: 'QuickMart Guindy', location: { lat: 13.0067, lng: 80.2206 }, avg_prep_time_per_item: 2, current_load: 15, image: '🍎' },
    ];

    // Products (Available in all shops for simplicity)
    const baseProducts = [
        { id: 'p1', name: 'Organic Milk 1L', price: 1.50, image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=150&q=80' },
        { id: 'p2', name: 'Whole Wheat Bread', price: 2.00, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=150&q=80' },
        { id: 'p3', name: 'Farm Eggs (12)', price: 3.50, image: 'https://images.unsplash.com/photo-1506976785307-8732e854ad02?auto=format&fit=crop&w=150&q=80' },
        { id: 'p4', name: 'Fresh Apples 1kg', price: 4.00, image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6faa6?auto=format&fit=crop&w=150&q=80' },
        { id: 'p5', name: 'Tomatoes 1kg', price: 1.20, image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=150&q=80' },
    ];

    DB.shops.forEach(shop => {
        baseProducts.forEach(p => {
            DB.products.push({ ...p, shop_id: shop.id, id: `${shop.id}_${p.id}` });
        });
    });

    // Drivers
    DB.drivers = [
        { id: 'd1', name: 'Raj Kumar', status: 'idle', location: { lat: 13.0100, lng: 80.2500 } },
        { id: 'd2', name: 'Arun M.', status: 'idle', location: { lat: 13.0400, lng: 80.2300 } },
    ];
}

// --- UTILITIES ---
function calculateDistance(loc1, loc2) {
    // Simplified Haversine for mock purposes (returns approx meters)
    const R = 6371e3; // metres
    const φ1 = loc1.lat * Math.PI/180;
    const φ2 = loc2.lat * Math.PI/180;
    const Δφ = (loc2.lat-loc1.lat) * Math.PI/180;
    const Δλ = (loc2.lng-loc1.lng) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- CORE ALGORITHMS ---

function calculateETA(shopId, cartItemsCount) {
    const shop = DB.shops.find(s => s.id === shopId);
    if (!shop) return null;

    // 1. Queue Time (How long to clear current load)
    const queueTime = shop.current_load * shop.avg_prep_time_per_item;
    
    // 2. Prep Time for our order
    const prepTime = cartItemsCount * shop.avg_prep_time_per_item;
    
    // 3. Delivery Time
    const distanceMeters = calculateDistance(shop.location, DB.userLocation);
    const deliveryTime = Math.ceil(distanceMeters / CONFIG.avgDriverSpeedMpm);

    return {
        queueTime: Math.ceil(queueTime),
        prepTime: Math.ceil(prepTime),
        deliveryTime,
        totalTime: Math.ceil(queueTime + prepTime + deliveryTime)
    };
}

function getShopLoadStatus(shop) {
    // Determine status based on current load (thresholds can be dynamic)
    if (shop.current_load < 8) return 'green';
    if (shop.current_load < 18) return 'yellow';
    return 'red';
}

function getSmartAlternativeShop(currentShopId, cartItemsCount) {
    const currentShop = DB.shops.find(s => s.id === currentShopId);
    const currentETA = calculateETA(currentShopId, cartItemsCount);
    
    let bestAlternative = null;
    let maxTimeSaved = 0;

    DB.shops.forEach(shop => {
        if (shop.id === currentShopId) return;
        
        const eta = calculateETA(shop.id, cartItemsCount);
        const timeSaved = currentETA.totalTime - eta.totalTime;
        
        // Only suggest if time saved is significant (e.g., > 5 mins) and load is better
        if (timeSaved > 5 && getShopLoadStatus(shop) !== 'red') {
            if (timeSaved > maxTimeSaved) {
                maxTimeSaved = timeSaved;
                bestAlternative = { shop, timeSaved, eta };
            }
        }
    });

    return bestAlternative;
}

// --- APP ENGINE (Simulation) ---
function startSimulation() {
    setInterval(() => {
        // Randomly fluctuate shop loads to simulate real-time queue changes
        DB.shops.forEach(shop => {
            const change = Math.floor(Math.random() * 5) - 2; // -2 to +2
            shop.current_load = Math.max(0, Math.min(50, shop.current_load + change));
        });

        // Process Orders
        DB.orders.forEach(order => {
            if (order.status === 'pending') {
                order.elapsed += 5; // sim speedup (5 mins per tick)
                if (order.elapsed >= order.eta.queueTime) {
                    order.status = 'cooking';
                    showToast(`Order ${order.id.slice(0,5)} is now Cooking!`, 'info');
                    
                    // Intelligent Driver Assignment: Assign only when cooking starts
                    const driver = DB.drivers.find(d => d.status === 'idle');
                    if (driver) {
                        driver.status = 'on_route_to_shop';
                        order.driverId = driver.id;
                        showToast(`Driver assigned to order ${order.id.slice(0,5)}`, 'success');
                    }
                }
            } else if (order.status === 'cooking') {
                order.elapsed += 5;
                if (order.elapsed >= order.eta.queueTime + order.eta.prepTime) {
                    order.status = 'ready';
                    showToast(`Order ${order.id.slice(0,5)} is Ready!`, 'success');
                }
            } else if (order.status === 'ready') {
                if (order.driverId) {
                    order.status = 'delivering';
                }
            } else if (order.status === 'delivering') {
                order.elapsed += 5;
                if (order.elapsed >= order.eta.totalTime) {
                    order.status = 'delivered';
                    showToast(`Order ${order.id.slice(0,5)} Delivered!`, 'success');
                    const driver = DB.drivers.find(d => d.id === order.driverId);
                    if(driver) driver.status = 'idle';
                }
            }
        });

        // Trigger UI Re-render if necessary
        if (currentView === 'home') renderHome();
        if (currentView === 'shop') renderShopDetail(DB.cart.shopId);
        if (currentView === 'tracking') renderTracking();

    }, 3000); // Tick every 3 seconds for demo purposes
}


// --- VIEW RENDERING ---
const appMain = document.getElementById('main-content');
let currentView = 'home';

function navigateTo(view, param = null) {
    currentView = view;
    appMain.innerHTML = ''; // Clear current
    
    // Update nav icons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    switch(view) {
        case 'home':
            renderHome();
            break;
        case 'shop':
            renderShopDetail(param);
            break;
        case 'checkout':
            renderCheckout();
            break;
        case 'tracking':
            renderTracking();
            break;
        case 'orders':
            // Redirect to tracking for now
            navigateTo('tracking');
            break;
    }
}

function renderHome() {
    const tpl = document.getElementById('tpl-home').content.cloneNode(true);
    const list = tpl.getElementById('shops-list');

    DB.shops.forEach(shop => {
        const cardTpl = document.getElementById('tpl-shop-card').content.cloneNode(true);
        const card = cardTpl.querySelector('.shop-card');
        
        cardTpl.querySelector('.shop-name').innerText = shop.name;
        cardTpl.querySelector('.shop-image').innerText = shop.image;
        
        const dist = (calculateDistance(shop.location, DB.userLocation)/1000).toFixed(1);
        cardTpl.querySelector('.shop-distance span').innerText = `${dist} km`;

        // Load Indicator Logic
        const status = getShopLoadStatus(shop);
        const dot = cardTpl.querySelector('.load-dot');
        dot.classList.add(status);
        
        let statusText = 'Normal';
        if (status === 'green') statusText = 'Fast / Idle';
        if (status === 'yellow') statusText = 'Moderate Queue';
        if (status === 'red') statusText = 'High Load';
        
        cardTpl.querySelector('.load-text').innerText = statusText;

        // Quick ETA
        const dummyEta = calculateETA(shop.id, 1);
        cardTpl.querySelector('.eta-text').innerText = ` • ~${dummyEta.totalTime}m ETA`;

        card.addEventListener('click', () => {
            DB.cart.shopId = shop.id; // Set active shop
            navigateTo('shop', shop.id);
        });

        list.appendChild(cardTpl);
    });

    appMain.appendChild(tpl);
}

function renderShopDetail(shopId) {
    const shop = DB.shops.find(s => s.id === shopId);
    const tpl = document.getElementById('tpl-shop-detail').content.cloneNode(true);
    
    tpl.querySelector('.shop-detail-name').innerText = shop.name;
    tpl.querySelector('.queue-count').innerText = shop.current_load;
    tpl.querySelector('.queue-wait').innerText = shop.current_load * shop.avg_prep_time_per_item;
    
    tpl.querySelector('.btn-back').addEventListener('click', () => navigateTo('home'));

    const list = tpl.getElementById('menu-list');
    const products = DB.products.filter(p => p.shop_id === shopId);
    
    products.forEach(p => {
        const pTpl = document.getElementById('tpl-product-card').content.cloneNode(true);
        const card = pTpl.querySelector('.product-card');
        
        card.querySelector('.product-name').innerText = p.name;
        card.querySelector('.product-price').innerText = `$${p.price.toFixed(2)}`;
        card.querySelector('.product-image').src = p.image;
        
        const btnAdd = card.querySelector('.btn-add');
        const qtyControls = card.querySelector('.quantity-controls');
        const qtyDisplay = card.querySelector('.qty-display');
        const btnMinus = card.querySelector('.btn-minus');
        const btnPlus = card.querySelector('.btn-plus');

        const refreshCardUI = () => {
            const count = DB.cart.items.filter(i => i.id === p.id).length;
            qtyDisplay.innerText = count;
            if (count > 0) {
                btnAdd.style.display = 'none';
                qtyControls.style.display = 'flex';
            } else {
                btnAdd.style.display = 'block';
                qtyControls.style.display = 'none';
            }
        };

        btnAdd.addEventListener('click', () => {
            DB.cart.items.push(p);
            refreshCardUI();
            updateCartSummary();
            showToast(`${p.name} added to cart`);
        });

        btnPlus.addEventListener('click', () => {
            DB.cart.items.push(p);
            refreshCardUI();
            updateCartSummary();
        });

        btnMinus.addEventListener('click', () => {
            const idx = DB.cart.items.findIndex(i => i.id === p.id);
            if (idx > -1) {
                DB.cart.items.splice(idx, 1);
            }
            refreshCardUI();
            updateCartSummary();
        });

        refreshCardUI();
        list.appendChild(card);
    });

    appMain.appendChild(tpl);
    updateCartSummary();
}

function updateCartSummary() {
    const summary = document.querySelector('.cart-summary');
    if (!summary) return;
    
    if (DB.cart.items.length > 0) {
        summary.style.display = 'flex';
        summary.querySelector('.cart-items').innerText = `${DB.cart.items.length} items`;
        const total = DB.cart.items.reduce((s, i) => s + i.price, 0);
        summary.querySelector('.cart-total').innerText = `$${total.toFixed(2)}`;
        
        summary.onclick = () => navigateTo('checkout');
    } else {
        summary.style.display = 'none';
    }
}

function renderCheckout() {
    const tpl = document.getElementById('tpl-checkout').content.cloneNode(true);
    
    tpl.querySelector('.btn-back').addEventListener('click', () => navigateTo('shop', DB.cart.shopId));

    const itemsContainer = tpl.getElementById('checkout-items');
    let total = 0;
    
    // Group items
    const counts = {};
    DB.cart.items.forEach(i => {
        counts[i.id] = (counts[i.id] || 0) + 1;
    });

    Object.keys(counts).forEach(id => {
        const item = DB.products.find(p => p.id === id);
        const div = document.createElement('div');
        div.className = 'checkout-item';
        div.innerHTML = `
            <div class="checkout-item-details">
                <img src="${item.image}" class="checkout-item-img">
                <div class="checkout-item-text">
                    <span class="name">${item.name}</span>
                    <span class="qty">Qty: ${counts[id]}</span>
                </div>
            </div>
            <span class="checkout-item-price">$${(item.price * counts[id]).toFixed(2)}</span>
        `;
        itemsContainer.appendChild(div);
        total += item.price * counts[id];
    });

    tpl.getElementById('checkout-total-price').innerText = `$${total.toFixed(2)}`;

    // ETA Calculation
    const eta = calculateETA(DB.cart.shopId, DB.cart.items.length);
    tpl.getElementById('eta-queue').innerText = `${eta.queueTime} mins`;
    tpl.getElementById('eta-prep').innerText = `${eta.prepTime} mins`;
    tpl.getElementById('eta-delivery').innerText = `${eta.deliveryTime} mins`;
    tpl.getElementById('eta-total').innerText = `${eta.totalTime} mins`;

    // Smart Suggestion Logic
    const suggestionBox = tpl.querySelector('.smart-suggestion');
    const altShop = getSmartAlternativeShop(DB.cart.shopId, DB.cart.items.length);
    
    if (altShop) {
        suggestionBox.style.display = 'block';
        suggestionBox.querySelector('.alt-shop-name').innerText = altShop.shop.name;
        suggestionBox.querySelector('.time-saved').innerText = altShop.timeSaved;
        
        suggestionBox.querySelector('.btn-accept').addEventListener('click', () => {
            // Swap shop
            DB.cart.shopId = altShop.shop.id;
            // Update item shop ids
            DB.cart.items = DB.cart.items.map(item => {
                const baseId = item.id.split('_')[1];
                return DB.products.find(p => p.id === `${altShop.shop.id}_${baseId}`);
            });
            showToast(`Switched to ${altShop.shop.name}! Routing optimized.`, 'success');
            navigateTo('checkout'); // re-render
        });
        
        suggestionBox.querySelector('.btn-ignore').addEventListener('click', () => {
            suggestionBox.style.display = 'none';
        });
    }

    // Place Order
    tpl.querySelector('.btn-place-order').addEventListener('click', () => {
        if (DB.cart.items.length === 0) return;
        
        const order = {
            id: 'ORD' + Math.floor(Math.random()*10000),
            shopId: DB.cart.shopId,
            items: [...DB.cart.items],
            total,
            eta: calculateETA(DB.cart.shopId, DB.cart.items.length),
            status: 'pending',
            elapsed: 0,
            driverId: null
        };
        
        DB.orders.push(order);
        
        // Increase shop load
        const shop = DB.shops.find(s => s.id === DB.cart.shopId);
        shop.current_load += DB.cart.items.length;

        // Clear cart
        DB.cart.items = [];
        DB.cart.shopId = null;

        showToast('Order Placed Successfully!', 'success');
        navigateTo('tracking');
    });

    appMain.appendChild(tpl);
}

function renderTracking() {
    const tpl = document.getElementById('tpl-tracking').content.cloneNode(true);
    const container = tpl.getElementById('active-orders-container');

    const activeOrders = DB.orders.filter(o => o.status !== 'delivered');
    
    if (activeOrders.length === 0) {
        container.innerHTML = '<p style="color:var(--text-secondary);text-align:center;margin-top:40px;">No active orders.</p>';
    }

    activeOrders.forEach(order => {
        const oTpl = document.getElementById('tpl-tracking-card').content.cloneNode(true);
        oTpl.querySelector('.order-id').innerText = order.id;
        
        const badge = oTpl.querySelector('.order-status-badge');
        badge.innerText = order.status.toUpperCase();
        if (order.status === 'ready' || order.status === 'delivering') badge.style.color = 'var(--status-green)';

        // Stepper
        const steps = ['pending', 'cooking', 'ready', 'delivering'];
        const currentIdx = steps.indexOf(order.status);
        
        steps.forEach((step, idx) => {
            if (idx <= currentIdx) {
                oTpl.querySelector(`.step-${step}`).classList.add('active');
            }
        });

        // Driver Info
        if (order.driverId) {
            const driverInfo = oTpl.querySelector('.driver-info');
            driverInfo.style.display = 'flex';
            const d = DB.drivers.find(dr => dr.id === order.driverId);
            oTpl.querySelector('.driver-name').innerText = d.name;
            oTpl.querySelector('.driver-status').innerText = 'Assigned & En Route';
        }

        // Map marker animation
        const marker = oTpl.querySelector('.driver-marker');
        if (order.status === 'pending') marker.style.left = '10%';
        if (order.status === 'cooking') marker.style.left = '40%';
        if (order.status === 'ready') marker.style.left = '50%';
        if (order.status === 'delivering') marker.style.left = '80%';

        container.appendChild(oTpl);
    });

    appMain.appendChild(tpl);
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    seedData();
    startSimulation();
    
    // Setup Nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = e.currentTarget.dataset.view;
            navigateTo(view);
        });
    });

    navigateTo('home');
});
