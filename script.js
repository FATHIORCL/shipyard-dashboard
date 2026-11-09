const STATUS_CONFIG = {
    completed: { label: 'مكتمل', color: 'var(--success-bar)' },
    processing: { label: 'قيد التنفيذ', color: 'var(--info-bar)' },
    pending: { label: 'بانتظار الدفع', color: 'var(--warning-bar)' },
    cancelled: { label: 'ملغي', color: 'var(--danger-bar)' }
};

const INITIAL_ORDERS = [
    {
        id: 'ORD-1048',
        customer: 'عمر المجالي',
        city: 'عمان',
        product: 'لابتوب ديل XPS 15',
        date: '2026-11-09',
        amount: 620,
        status: 'completed'
    },
    {
        id: 'ORD-1047',
        customer: 'لينا الخصاونة',
        city: 'إربد',
        product: 'سماعة أبل إيربودز برو',
        date: '2026-11-09',
        amount: 140,
        status: 'processing'
    },
    {
        id: 'ORD-1046',
        customer: 'طارق حداد',
        city: 'الزرقاء',
        product: 'شاشة سامسونج 32 بوصة 4K',
        date: '2026-11-08',
        amount: 280,
        status: 'completed'
    },
    {
        id: 'ORD-1045',
        customer: 'دانا المصري',
        city: 'السلط',
        product: 'ساعة ذكية هواوي GT4',
        date: '2026-11-08',
        amount: 110,
        status: 'pending'
    },
    {
        id: 'ORD-1044',
        customer: 'رامي القضاة',
        city: 'عجلون',
        product: 'لوحة مفاتيح ميكانيكية لاسلكية',
        date: '2026-11-07',
        amount: 65,
        status: 'processing'
    },
    {
        id: 'ORD-1043',
        customer: 'نور العبادي',
        city: 'عمان',
        product: 'آيباد إير الجيل الخامس',
        date: '2026-11-07',
        amount: 450,
        status: 'completed'
    },
    {
        id: 'ORD-1042',
        customer: 'حمزة التميمي',
        city: 'العقبة',
        product: 'كاميرا مراقبة ذكية Wi-Fi',
        date: '2026-11-06',
        amount: 45,
        status: 'cancelled'
    },
    {
        id: 'ORD-1041',
        customer: 'فرح الروسان',
        city: 'إربد',
        product: 'حقيبة ظهر للابتوب مقاومة للماء',
        date: '2026-11-05',
        amount: 30,
        status: 'completed'
    }
];

// استرجاع البيانات أو استخدام البيانات المبدئية الأردنية
let orders = JSON.parse(localStorage.getItem('shipyard_orders'));
if (!orders || !orders.length) {
    orders = [...INITIAL_ORDERS];
}

let currentStatusFilter = 'all';
let currentSearchQuery = '';
let currentSort = 'date-desc';

// عناصر DOM
const ordersTbody = document.getElementById('orders-tbody');
const emptyState = document.getElementById('empty-state');
const showingCount = document.getElementById('showing-count');
const searchInput = document.getElementById('search-input');
const statusTabs = document.getElementById('status-tabs');
const sortSelect = document.getElementById('sort-select');

// عناصر الإحصائيات
const statTotal = document.getElementById('stat-total');
const statCompleted = document.getElementById('stat-completed');
const statCompletedRate = document.getElementById('stat-completed-rate');
const statProcessing = document.getElementById('stat-processing');
const statRevenue = document.getElementById('stat-revenue');
const statusProgressBar = document.getElementById('status-progress-bar');
const statusLegend = document.getElementById('status-legend');

// عناصر النافذة المنبثقة
const orderModal = document.getElementById('order-modal');
const orderForm = document.getElementById('order-form');
const btnOpenModal = document.getElementById('btn-open-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCancelModal = document.getElementById('btn-cancel-modal');

// عناصر الوضع الليلي والتصدير
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const themeText = document.getElementById('theme-text');
const btnExportCsv = document.getElementById('btn-export-csv');

function saveOrders() {
    localStorage.setItem('shipyard_orders', JSON.stringify(orders));
}

function formatCurrency(value) {
    return `${Number(value).toLocaleString('ar-JO')} د.أ`;
}

// تحديث الإحصائيات وشريط التوزيع
function updateStats() {
    const total = orders.length;
    const completed = orders.filter(o => o.status === 'completed').length;
    const processing = orders.filter(o => o.status === 'processing' || o.status === 'pending').length;
    const revenue = orders
        .filter(o => o.status !== 'cancelled')
        .reduce((sum, o) => sum + Number(o.amount), 0);

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    statTotal.textContent = total;
    statCompleted.textContent = completed;
    statCompletedRate.textContent = `${completionRate}% نسبة الإنجاز`;
    statProcessing.textContent = processing;
    statRevenue.textContent = formatCurrency(revenue);

    // تحديث شريط التوزيع
    statusProgressBar.innerHTML = '';
    statusLegend.innerHTML = '';

    Object.entries(STATUS_CONFIG).forEach(([key, config]) => {
        const count = orders.filter(o => o.status === key).length;
        const percent = total > 0 ? ((count / total) * 100).toFixed(1) : 0;

        if (count > 0) {
            const segment = document.createElement('div');
            segment.className = 'progress-segment';
            segment.style.width = `${percent}%`;
            segment.style.backgroundColor = config.color;
            segment.title = `${config.label}: ${count} (${percent}%)`;
            statusProgressBar.appendChild(segment);
        }

        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <span class="legend-dot" style="background-color: ${config.color}"></span>
            <span>${config.label}: <strong>${count}</strong> (${Math.round(percent)}%)</span>
        `;
        statusLegend.appendChild(legendItem);
    });
}

// فلترة وترتيب الطلبات
function getFilteredAndSortedOrders() {
    return orders
        .filter(order => {
            const matchesStatus = currentStatusFilter === 'all' || order.status === currentStatusFilter;
            const query = currentSearchQuery.trim().toLowerCase();
            const matchesSearch =
                !query ||
                order.id.toLowerCase().includes(query) ||
                order.customer.toLowerCase().includes(query) ||
                order.city.toLowerCase().includes(query) ||
                order.product.toLowerCase().includes(query);

            return matchesStatus && matchesSearch;
        })
        .sort((a, b) => {
            if (currentSort === 'date-desc') return new Date(b.date) - new Date(a.date);
            if (currentSort === 'date-asc') return new Date(a.date) - new Date(b.date);
            if (currentSort === 'amount-desc') return b.amount - a.amount;
            if (currentSort === 'amount-asc') return a.amount - b.amount;
            return 0;
        });
}

// رسم جدول الطلبات
function renderTable() {
    const filtered = getFilteredAndSortedOrders();
    ordersTbody.innerHTML = '';

    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        filtered.forEach(order => {
            const tr = document.createElement('tr');
            const statusInfo = STATUS_CONFIG[order.status] || STATUS_CONFIG.processing;

            tr.innerHTML = `
                <td><span class="order-id">#${order.id}</span></td>
                <td>
                    <div class="customer-cell">
                        <span class="customer-name">${order.customer}</span>
                        <span class="customer-city">📍 ${order.city}</span>
                    </div>
                </td>
                <td>${order.product}</td>
                <td>${order.date}</td>
                <td class="amount-cell">${formatCurrency(order.amount)}</td>
                <td>
                    <span class="badge ${order.status}">${statusInfo.label}</span>
                </td>
                <td>
                    <div class="row-actions">
                        <select class="status-Select-inline" data-id="${order.id}" aria-label="تغيير حالة الطلب">
                            <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>مكتمل</option>
                            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>قيد التنفيذ</option>
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>بانتظار الدفع</option>
                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>ملغي</option>
                        </select>
                        <button class="btn-icon-delete" data-delete-id="${order.id}" title="حذف الطلب">🗑️</button>
                    </div>
                </td>
            `;
            ordersTbody.appendChild(tr);
        });
    }

    showingCount.textContent = `عرض ${filtered.length} من أصل ${orders.length} طلب`;
}

function renderDashboard() {
    updateStats();
    renderTable();
}

// أحداث البحث والفلترة
searchInput.addEventListener('input', e => {
    currentSearchQuery = e.target.value;
    renderTable();
});

statusTabs.addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;

    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentStatusFilter = btn.dataset.status;
    renderTable();
});

sortSelect.addEventListener('change', e => {
    currentSort = e.target.value;
    renderTable();
});

// أحداث تغيير الحالة أو الحذف داخل الجدول
ordersTbody.addEventListener('change', e => {
    if (e.target.classList.contains('status-Select-inline')) {
        const orderId = e.target.dataset.id;
        const newStatus = e.target.value;
        const targetOrder = orders.find(o => o.id === orderId);
        if (targetOrder) {
            targetOrder.status = newStatus;
            saveOrders();
            renderDashboard();
        }
    }
});

ordersTbody.addEventListener('click', e => {
    const deleteBtn = e.target.closest('.btn-icon-delete');
    if (!deleteBtn) return;

    const orderId = deleteBtn.dataset.deleteId;
    orders = orders.filter(o => o.id !== orderId);
    saveOrders();
    renderDashboard();
});

// إدارة نافذة إضافة طلب جديد
function closeModal() {
    orderModal.classList.add('hidden');
    orderForm.reset();
}

btnOpenModal.addEventListener('click', () => {
    orderModal.classList.remove('hidden');
    document.getElementById('customer-name').focus();
});

btnCloseModal.addEventListener('click', closeModal);
btnCancelModal.addEventListener('click', closeModal);
orderModal.addEventListener('click', e => {
    if (e.target === orderModal) closeModal();
});

orderForm.addEventListener('submit', e => {
    e.preventDefault();

    const customer = document.getElementById('customer-name').value.trim();
    const city = document.getElementById('customer-city').value.trim();
    const product = document.getElementById('product-name').value.trim();
    const amount = parseFloat(document.getElementById('order-amount').value);
    const status = document.getElementById('order-status').value;

    const nextNumber = orders.length > 0
        ? Math.max(...orders.map(o => parseInt(o.id.replace('ORD-', ''), 10) || 1000)) + 1
        : 1001;

    const today = new Date().toISOString().split('T')[0];

    const newOrder = {
        id: `ORD-${nextNumber}`,
        customer,
        city,
        product,
        date: today,
        amount,
        status
    };

    orders.unshift(newOrder);
    saveOrders();
    renderDashboard();
    closeModal();
});

// تبديل الوضع الليلي / النهاري
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    themeIcon.textContent = isDark ? '☀️' : '🌙';
    themeText.textContent = isDark ? 'الوضع النهاري' : 'الوضع الليلي';
});

// تصدير البيانات إلى ملف CSV
btnExportCsv.addEventListener('click', e => {
    e.preventDefault();
    const headers = ['رقم الطلب', 'العميل', 'المدينة', 'المنتج', 'التاريخ', 'المبلغ (د.أ)', 'الحالة'];
    const rows = orders.map(o => [
        o.id,
        `"${o.customer}"`,
        `"${o.city}"`,
        `"${o.product}"`,
        o.date,
        o.amount,
        `"${STATUS_CONFIG[o.status]?.label || o.status}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'shipyard-orders-report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
});

// التشغيل الأولي
renderDashboard();
