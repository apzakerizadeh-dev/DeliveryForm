// متغیرهای سراسری
let productCount = 0;
let currentSvgContent = "";
let currentJpgBlob = null; // ذخیره blob فایل JPG
let currentFileName = ""; // نام فایل برای دانلود

// وقتی صفحه کاملاً بارگذاری شد
document.addEventListener('DOMContentLoaded', function() {
    // مقداردهی اولیه
    initializeApp();
    
    // رویدادها
    document.getElementById('addProduct').addEventListener('click', addProductRow);
    document.getElementById('generateBtn').addEventListener('click', generateSVG);
    document.getElementById('previewBtn').addEventListener('click', previewSVG);
    document.getElementById('resetBtn').addEventListener('click', resetForm);
    document.getElementById('printBtn').addEventListener('click', printForm);
    document.getElementById('downloadBtn').addEventListener('click', downloadSVG);
    document.getElementById('shareBtn').addEventListener('click', shareSVG);
    document.getElementById('copyBtn').addEventListener('click', copySVG);
    document.getElementById('closePreview').addEventListener('click', closePreview);
    
    // رویداد ذخیره خودکار
    setupAutoSave();
    
    // بارگذاری داده‌های ذخیره شده
    loadSavedData();

    // نمایش شماره فرم فعلی در کنسول (برای دیباگ)
    console.log('شماره فرم فعلی:', getCurrentFormNumber());
});

// توابع جدید برای مدیریت شماره فرم
function getNextFormNumber() {
    let formNumber = localStorage.getItem('deliveryFormNumber');
    if (!formNumber) {
        formNumber = 1;
    } else {
        formNumber = parseInt(formNumber) + 1;
    }
    localStorage.setItem('deliveryFormNumber', formNumber.toString());
    return formNumber;
}

function getCurrentFormNumber() {
    let formNumber = localStorage.getItem('deliveryFormNumber');
    if (!formNumber) {
        formNumber = 1;
        localStorage.setItem('deliveryFormNumber', formNumber.toString());
    }
    return parseInt(formNumber);
}

function resetFormNumber() {
    if (confirm('آیا می‌خواهید شماره فرم را از ۱ شروع کنید؟')) {
        localStorage.setItem('deliveryFormNumber', '1');
        updateFormNumberDisplay();
        showMessage('شماره فرم از ۱ شروع شد', 'success');
    }
}

// مقداردهی اولیه برنامه
function initializeApp() {
    // اضافه کردن دو ردیف محصول به صورت پیش‌فرض
    addProductRow();
    addProductRow();
    
    // تنظیم تاریخ امروز در یادداشت‌ها به صورت پیش‌فرض
    const today = new Date().toLocaleDateString('fa-IR');
    const notesField = document.getElementById('notes');
    if (!notesField.value) {
        notesField.value = `تاریخ درخواست: ${today}\nساعات کاری: ۸ صبح تا ۵ عصر\nآدرس دقیق با ذکر پلاک ضروری است`;
    }
    
    // به روزرسانی نمایش شماره فرم
    updateFormNumberDisplay();
    
    // رویداد برای دکمه ریست شماره فرم
    document.getElementById('resetFormNumberBtn').addEventListener('click', function(e) {
        e.preventDefault();
        resetFormNumber();
    });
    
    showMessage('برنامه آماده استفاده است. لطفا اطلاعات فرم را وارد نمایید.', 'info');
}

// تابع برای به روزرسانی نمایش شماره فرم
function updateFormNumberDisplay() {
    const nextFormNumber = getCurrentFormNumber();
    document.getElementById('nextFormNumber').textContent = nextFormNumber;
}

// روش ساده Base64 برای تبدیل SVG به JPG
async function convertSvgToJpgBase64(svgContent, fileName, formData) {
    return new Promise(async (resolve, reject) => {
        try {
            // 1. ابتدا SVG را به Data URL تبدیل می‌کنیم
            const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
            const svgUrl = URL.createObjectURL(svgBlob);
            
            // 2. ایجاد یک image element برای بارگذاری SVG
            const img = new Image();
            
            img.onload = function() {
                try {
                    // 3. محاسبه ارتفاع بر اساس داده‌ها
                    const baseHeight = 800;
                    const productRowHeight = 40;
                    const additionalHeight = formData.products.length * productRowHeight;
                    const notesHeight = formData.notes ? 120 : 0;
                    const totalHeight = baseHeight + additionalHeight + notesHeight;
                    
                    // 4. ایجاد canvas
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // تنظیم ابعاد canvas
                    const width = 1200;
                    const height = Math.max(totalHeight, 800);
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // 5. پر کردن پس‌زمینه سفید
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, width, height);
                    
                    // 6. رسم SVG روی canvas
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // 7. تبدیل canvas به Data URL (JPG)
                    const jpgDataUrl = canvas.toDataURL('image/jpeg', 0.9);
                    
                    // 8. تبدیل Data URL به Blob
                    const byteString = atob(jpgDataUrl.split(',')[1]);
                    const mimeString = jpgDataUrl.split(',')[0].split(':')[1].split(';')[0];
                    const ab = new ArrayBuffer(byteString.length);
                    const ia = new Uint8Array(ab);
                    
                    for (let i = 0; i < byteString.length; i++) {
                        ia[i] = byteString.charCodeAt(i);
                    }
                    
                    const blob = new Blob([ab], { type: mimeString });
                    
                    // 9. آزاد کردن URL
                    URL.revokeObjectURL(svgUrl);
                    
                    resolve({
                        blob: blob,
                        dataUrl: jpgDataUrl,
                        fileName: fileName.replace('.svg', '.jpg')
                    });
                    
                } catch (canvasError) {
                    URL.revokeObjectURL(svgUrl);
                    reject(canvasError);
                }
            };
            
            img.onerror = function(error) {
                URL.revokeObjectURL(svgUrl);
                reject(new Error('خطا در بارگذاری SVG: ' + error));
            };
            
            // بارگذاری تصویر
            img.src = svgUrl;
            
            // تایم‌اوت برای جلوگیری از انتظار بی‌پایان
            setTimeout(() => {
                if (!img.complete) {
                    URL.revokeObjectURL(svgUrl);
                    reject(new Error('تایم‌اوت در بارگذاری SVG'));
                }
            }, 5000);
            
        } catch (error) {
            reject(error);
        }
    });
}

// اضافه کردن ردیف محصول جدید
function addProductRow() {
    const container = document.getElementById('productsContainer');
    const template = document.getElementById('productTemplate');
    const clone = template.content.cloneNode(true);
    
    productCount++;
    
    // به‌روزرسانی شماره محصول
    const productNumber = clone.querySelector('.product-number');
    productNumber.textContent = `#${productCount}`;
    
    // اضافه کردن رویداد حذف
    const removeBtn = clone.querySelector('.remove-product');
    removeBtn.addEventListener('click', function() {
        if (confirm('آیا از حذف این محصول اطمینان دارید؟')) {
            this.closest('.product-row').remove();
            updateProductNumbers();
            saveToLocalStorage();
            showMessage('محصول با موفقیت حذف شد', 'success');
        }
    });
    
    // رویداد تغییر مقدار برای ذخیره خودکار
    const inputs = clone.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('change', saveToLocalStorage);
    });
    
    // اضافه کردن به کانتینر
    container.appendChild(clone);
    
    // انیمیشن
    const newRow = container.lastElementChild;
    newRow.classList.add('fade-in-up');
    
    // ذخیره خودکار
    saveToLocalStorage();
    
    showMessage(`ردیف محصول ${productCount} اضافه شد`, 'success');
}

// به‌روزرسانی شماره محصولات
function updateProductNumbers() {
    const productRows = document.querySelectorAll('.product-row');
    productCount = productRows.length;
    
    productRows.forEach((row, index) => {
        const numberSpan = row.querySelector('.product-number');
        if (numberSpan) {
            numberSpan.textContent = `#${index + 1}`;
        }
    });
}

// جمع‌آوری داده‌های فرم
function collectFormData() {
    const productRows = document.querySelectorAll('.product-row');
    const products = [];
    
    productRows.forEach((row, index) => {
        const description = row.querySelector('.description') ? row.querySelector('.description').value : '';
        products.push({
            rowNumber: index + 1,
            brand: row.querySelector('.brand').value,
            capacity: row.querySelector('.capacity').value,
            climate: row.querySelector('.climate').value,
            compressor: row.querySelector('.compressor').value,
            location: row.querySelector('.location').value,
            deviceType: row.querySelector('.deviceType').value,
            qty: row.querySelector('.qty').value || '1',
            description: description
        });
    });
    
    // شماره فرم فعلی (بدون افزایش)
    const currentFormNumber = getCurrentFormNumber();
    
    return {
        formNumber: currentFormNumber, // شماره فرم فعلی
        nextFormNumber: getCurrentFormNumber() + 1, // شماره فرم بعدی
        buyer: document.getElementById('buyerName').value.trim(),
        receiver: document.getElementById('receiverName').value.trim(),
        address: document.getElementById('address').value.trim(),
        postalCode: document.getElementById('postalCode').value.trim(),
        discount: document.getElementById('discount').value.trim(),
        notes: document.getElementById('notes').value.trim(),
        products: products,
        timestamp: new Date().toLocaleString('fa-IR'),
        date: new Date().toLocaleDateString('fa-IR'),
        time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
    };
}

// اعتبارسنجی فرم
function validateForm(data) {
    const errors = [];
    
    if (!data.buyer) errors.push('لطفاً نام خریدار را وارد کنید');
    if (!data.receiver) errors.push('لطفاً نام دریافت‌کننده را وارد کنید');
    if (!data.address) errors.push('لطفاً آدرس تحویل را وارد کنید');
    
    if (data.products.length === 0) {
        errors.push('لطفاً حداقل یک محصول اضافه کنید');
    } else {
        data.products.forEach((product, index) => {
            if (!product.qty || product.qty < 1) {
                errors.push(`تعداد در محصول ${index + 1} باید حداقل ۱ باشد`);
            }
        });
    }
    
    if (errors.length > 0) {
        showMessage('خطاهای زیر را برطرف کنید:<br>' + errors.join('<br>'), 'danger');
        return false;
    }
    
    return true;
}

// تولید SVG و JPG
async function generateSVG() {
    // افزایش شماره فرم
    const formNumber = getNextFormNumber();

    // جمع‌آوری داده‌های فرم
    const formData = collectFormData();
    formData.formNumber = formNumber - 1;
    
    // اعتبارسنجی
    if (!validateForm(formData)) {
        decreaseFormNumber();
        return;
    }
    
    // تولید محتوای SVG
    const svgContent = createSVGContent(formData);
    currentSvgContent = svgContent;
    
    // تولید فایل JPG با روش Base64
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const baseFileName = `فرم-تحویل-${formData.formNumber}-${timestamp}`;
        
        const jpgResult = await convertSvgToJpgBase64(svgContent, baseFileName, formData);
        currentJpgBlob = jpgResult.blob;
        currentFileName = jpgResult.fileName;
        
        // نمایش پیش‌نمایش
        showPreview(svgContent, jpgResult.dataUrl);
        
        // نمایش پیام موفقیت
        showMessage('✅ فایل SVG و JPG با موفقیت تولید شدند! می‌توانید فایل JPG را دانلود کنید.', 'success');
        
        // ذخیره خودکار
        saveToLocalStorage();
    } catch (error) {
        // در صورت خطا فقط SVG نمایش داده شود
        showMessage('⚠️ فایل SVG تولید شد اما تبدیل به JPG با خطا مواجه شد.', 'warning');
        showPreview(svgContent);
        console.error('خطا در تولید JPG:', error);
    }
}

// پیش‌نمایش SVG و JPG
async function previewSVG() {
    const formData = collectFormData();
    
    if (!validateForm(formData)) {
        return;
    }
    
    const svgContent = createSVGContent(formData);
    currentSvgContent = svgContent;
    
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const baseFileName = `فرم-تحویل-${formData.formNumber}-${timestamp}`;
        
        const jpgResult = await convertSvgToJpgBase64(svgContent, baseFileName, formData);
        currentJpgBlob = jpgResult.blob;
        currentFileName = jpgResult.fileName;
        
        showPreview(svgContent, jpgResult.dataUrl);
    } catch (error) {
        showMessage('⚠️ پیش‌نمایش JPG در دسترس نیست. فقط SVG نمایش داده می‌شود.', 'warning');
        showPreview(svgContent);
        console.error('خطای تبدیل JPG:', error);
    }
}

// تابع کمکی برای کاهش شماره فرم در صورت خطا
function decreaseFormNumber() {
    let formNumber = localStorage.getItem('deliveryFormNumber');
    if (formNumber && parseInt(formNumber) > 1) {
        formNumber = parseInt(formNumber) - 1;
        localStorage.setItem('deliveryFormNumber', formNumber.toString());
        updateFormNumberDisplay();
    }
}

// ایجاد محتوای SVG با راست‌چین کامل
function createSVGContent(data) {
    const now = new Date();
    const persianDate = now.toLocaleDateString('fa-IR');
    const persianTime = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    
    // محاسبه ارتفاع بر اساس تعداد محصولات
    const baseHeight = 800;
    const productRowHeight = 40;
    const additionalHeight = data.products.length * productRowHeight;
    const notesHeight = data.notes ? 120 : 0;
    const totalHeight = baseHeight + additionalHeight + notesHeight;
    
    // محاسبه موقعیت Y برای بخش‌های مختلف
    const notesStartY = 600 + (data.products.length * 40) + 40;
    const notesTextY = notesStartY + 40;
    
    // شروع ساخت SVG
    let svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${totalHeight}" viewBox="0 0 1200 ${totalHeight}" direction="rtl">
  <defs>
    <style>
      @import url('https://cdn.jsdelivr.net/gh/rastikerdar/vazir-font@v30.1.0/dist/font-face.css');
      .title { font-size: 40px; font-weight: bold; fill: #2c5aa0; font-family: 'Vazir', sans-serif; }
      .header { font-size: 28px; font-weight: 600; fill: #2c3e50; font-family: 'Vazir', sans-serif; }
      .label { font-size: 22px; fill: #7f8c8d; font-family: 'Vazir', sans-serif; }
      .value { font-size: 22px; font-weight: 500; fill: #2c3e50; font-family: 'Vazir', sans-serif; }
      .table-header { font-size: 20px; font-weight: bold; fill: white; font-family: 'Vazir', sans-serif; }
      .table-row { font-size: 18px; fill: #2c3e50; font-family: 'Vazir', sans-serif; }
      .table-row-number { font-size: 18px; fill: #2c5aa0; font-weight: bold; font-family: 'Vazir', sans-serif; }
      .footer { font-size: 18px; fill: #95a5a6; font-family: 'Vazir', sans-serif; }
      .notes { font-size: 20px; fill: #2c3e50; font-family: 'Vazir', sans-serif; }
      .small { font-size: 16px; font-family: 'Vazir', sans-serif; }
      .form-number { font-size: 22px; fill: white; font-weight: bold; font-family: 'Vazir', sans-serif; }
    </style>
    <linearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#2c5aa0;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#4a9eff;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- پس‌زمینه -->
  <rect width="100%" height="100%" fill="white"/>
  
  <!-- هدر -->
  <rect x="0" y="0" width="1200" height="120" fill="url(#headerGradient)"/>
  
  <!-- عنوان اصلی (وسط چین) -->
  <text x="600" y="70" text-anchor="middle" class="title" fill="white"> فرم درخواست تحویل کالا </text>
  
  <!-- تاریخ و شماره فرم (وسط چین) -->
  <text x="600" y="110" text-anchor="middle" class="small" fill="rgba(255,255,255,0.9)">تاریخ: ${persianDate} | شماره فرم: ${data.formNumber}</text>
  
  <!-- اطلاعات مشتری -->
  <rect x="60" y="150" width="1080" height="300" fill="#f8f9fa" stroke="#2c5aa0" stroke-width="2" rx="15"/>
  
  <!-- عنوان بخش مشتری (وسط چین) -->
  <text x="600" y="190" text-anchor="middle" class="header">مشخصات مشتری</text>
  
  <!-- ردیف‌های اطلاعات -->
  <text x="900" y="240" text-anchor="end" class="label">نام خریدار:</text>
  <text x="600" y="240" text-anchor="middle" class="value">${data.buyer || 'تعیین نشده'}</text>
  
  <text x="900" y="290" text-anchor="end" class="label">نام دریافت‌کننده:</text>
  <text x="600" y="290" text-anchor="middle" class="value">${data.receiver || 'تعیین نشده'}</text>
  
  <text x="900" y="340" text-anchor="end" class="label">آدرس تحویل:</text>
  <text x="600" y="340" text-anchor="middle" class="value">${data.address || 'تعیین نشده'}</text>
  
  <text x="900" y="390" text-anchor="end" class="label">کد پستی:</text>
  <text x="600" y="390" text-anchor="middle" class="value">${data.postalCode || 'تعیین نشده'}</text>
  
  <text x="900" y="440" text-anchor="end" class="label">درصد تخفیف:</text>
  <text x="600" y="440" text-anchor="middle" class="value">${data.discount ? data.discount + '%' : '۰%'}</text>
  
  <!-- جدول محصولات -->
  <text x="600" y="500" text-anchor="middle" class="header">لیست محصولات</text>
  
  <!-- هدر جدول -->
  <rect x="60" y="530" width="1080" height="60" fill="#2c5aa0" rx="8"/>
  
  <!-- سرستون‌های جدول -->
  <text x="90" y="570" text-anchor="middle" class="table-header">ردیف</text>
  <text x="180" y="570" text-anchor="middle" class="table-header">ظرفیت</text>
  <text x="300" y="570" text-anchor="middle" class="table-header">برند</text>
  <text x="420" y="570" text-anchor="middle" class="table-header">کلاس دمایی</text>
  <text x="550" y="570" text-anchor="middle" class="table-header">یونیت داخلی</text>
  <text x="680" y="570" text-anchor="middle" class="table-header">نوع کمپرسور</text>
  <text x="800" y="570" text-anchor="middle" class="table-header">تعداد</text>
  <text x="900" y="570" text-anchor="middle" class="table-header">نوع دستگاه</text>
  <text x="1050" y="570" text-anchor="middle" class="table-header">توضیحات</text>
  
  <!-- ردیف‌های محصولات -->
  ${generateProductRows(data.products)}
  
  <!-- یادداشت‌ها -->
  ${data.notes ? `
  <text x="600" y="${notesStartY}" text-anchor="middle" class="header">توضیحات و یادداشت‌ها</text>
  <rect x="60" y="${notesStartY + 20}" width="1080" height="${notesHeight - 40}" fill="#f1f8ff" stroke="#4a9eff" stroke-width="1" rx="10"/>
  <text x="1150" y="${notesTextY}" text-anchor="end" class="notes">
    ${formatMultilineText(data.notes, 60, notesTextY)}
  </text>
  ` : ''}
  
  <!-- فوتر -->
  <rect x="0" y="${totalHeight - 70}" width="1200" height="70" fill="#2c3e50"/>
  <text x="600" y="${totalHeight - 25}" text-anchor="middle" class="footer" fill="white">صنایع تولیدی خانه سپید مشرق زمین</text>
  
  <!-- شماره صفحه و زمان -->
  <text x="950" y="${totalHeight - 25}" text-anchor="end" class="small" fill="white">صفحه ۱ از ۱ | ساعت: ${persianTime}</text>
</svg>`;

    return svg;
}

// تولید ردیف‌های محصولات در SVG
function generateProductRows(products) {
    let rows = '';
    const startY = 600;
    
    // اصلاح موقعیت X ستون‌ها - همه باید بین 60 تا 1140 باشند
    const columns = [
        { x: 90, align: 'middle', width: 60 },     // ردیف (جابجا به چپ)
        { x: 180, align: 'middle', width: 100 },   // ظرفیت
        { x: 300, align: 'middle', width: 100 },   // برند
        { x: 420, align: 'middle', width: 120 },   // کلاس دمایی
        { x: 550, align: 'middle', width: 120 },   // یونیت داخلی
        { x: 680, align: 'middle', width: 120 },   // نوع کمپرسور
        { x: 800, align: 'middle', width: 80 },    // تعداد
        { x: 900, align: 'middle', width: 100 },   // نوع دستگاه
        { x: 1050, align: 'start', width: 180 }    // توضیحات (جابجا به چپ)
    ];
    
    products.forEach((product, index) => {
        const y = startY + (index * 40);
        const rowColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
        
        rows += `
  <!-- ردیف ${index + 1} -->
  <rect x="60" y="${y}" width="1080" height="40" fill="${rowColor}" stroke="#e9ecef" stroke-width="1"/>
  
  <!-- اطلاعات محصول -->
  <text x="${columns[0].x}" y="${y + 28}" text-anchor="${columns[0].align}" class="table-row-number">${index + 1}</text>
  <text x="${columns[1].x}" y="${y + 28}" text-anchor="${columns[1].align}" class="table-row">${product.capacity || ''}</text>
  <text x="${columns[2].x}" y="${y + 28}" text-anchor="${columns[2].align}" class="table-row">${product.brand || ''}</text>
  <text x="${columns[3].x}" y="${y + 28}" text-anchor="${columns[3].align}" class="table-row">${product.climate || ''}</text>
  <text x="${columns[4].x}" y="${y + 28}" text-anchor="${columns[4].align}" class="table-row">${product.location || ''}</text>
  <text x="${columns[5].x}" y="${y + 28}" text-anchor="${columns[5].align}" class="table-row">${product.compressor || ''}</text>
  <text x="${columns[6].x}" y="${y + 28}" text-anchor="${columns[6].align}" class="table-row">${product.qty || '1'}</text>
  <text x="${columns[7].x}" y="${y + 28}" text-anchor="${columns[7].align}" class="table-row">${product.deviceType || ''}</text>
  <text x="${columns[8].x}" y="${y + 28}" text-anchor="${columns[8].align}" class="table-row">${product.description || ''}</text>
  
  <!-- خط جداکننده -->
  ${index < products.length - 1 ? `<line x1="60" y1="${y + 40}" x2="1140" y2="${y + 40}" stroke="#dee2e6" stroke-width="0.5"/>` : ''}`;
    });
    
    return rows;
}

// فرمت‌بندی متن چند خطی (نسخه بهبود یافته)
function formatMultilineText(text, startX, startY) {
    // اگر متن خط جدید دارد، آن را به tspan تبدیل می‌کند
    const lines = text.split('\n');
    let result = '';
    
    lines.forEach((line, index) => {
        if (line.trim()) {
            const dy = index === 0 ? `0` : '1.5em';
            // تغییر از text به tspan برای نمایش چند خطی
            if (index === 0) {
                result += `<tspan x="${startX}" y="${startY}">${line}</tspan>`;
            } else {
                result += `<tspan x="${startX}" dy="${dy}">${line}</tspan>`;
            }
        }
    });
    
    return result;
}

// نمایش پیش‌نمایش SVG و JPG
function showPreview(svgContent, jpgDataUrl = null) {
    const previewSection = document.getElementById('previewSection');
    const svgPreview = document.getElementById('svgPreview');
    
    // نمایش بخش پیش‌نمایش
    previewSection.style.display = 'block';
    
    // اضافه کردن SVG و JPG به صفحه
    let previewContent = '';
    
    if (jpgDataUrl) {
        previewContent = `
            <div class="row">
                <div class="col-md-6 mb-3">
                    <h6 class="text-center mb-2 text-success"><i class="bi bi-file-earmark-image me-2"></i>پیش‌نمایش JPG</h6>
                    <img src="${jpgDataUrl}" alt="پیش‌نمایش JPG" class="img-fluid border rounded shadow-sm" style="max-height: 400px; width: 100%;">
                    <p class="text-center text-muted small mt-2">فایل JPG (برای اشتراک‌گذاری و چاپ)</p>
                </div>
                <div class="col-md-6">
                    <h6 class="text-center mb-2 text-primary"><i class="bi bi-file-earmark-code me-2"></i>پیش‌نمایش SVG</h6>
                    <div class="border rounded p-2 bg-white" style="overflow: auto; max-height: 400px;">${svgContent}</div>
                    <p class="text-center text-muted small mt-2">فایل SVG (برای ویرایش و کیفیت برداری)</p>
                </div>
            </div>
        `;
    } else {
        previewContent = `
            <div class="text-center">
                <h6 class="text-center mb-2 text-primary"><i class="bi bi-file-earmark-code me-2"></i>پیش‌نمایش SVG</h6>
                <div class="border rounded p-2 bg-white" style="overflow: auto; max-height: 500px;">${svgContent}</div>
                <p class="text-center text-muted small mt-2">فایل SVG - فایل JPG در دسترس نیست</p>
            </div>
        `;
    }
    
    svgPreview.innerHTML = previewContent;
    
    // اسکرول به بخش پیش‌نمایش
    previewSection.scrollIntoView({ behavior: 'smooth' });
    
    showMessage('پیش‌نمایش فایل‌های تولید شده آماده است', 'info');
}

// بستن پیش‌نمایش
function closePreview() {
    document.getElementById('previewSection').style.display = 'none';
    showMessage('پیش‌نمایش بسته شد', 'info');
}

// دانلود فایل JPG (اصلی)
function downloadSVG() {
    if (!currentJpgBlob) {
        showMessage('❌ ابتدا فایل‌ها را تولید کنید', 'warning');
        return;
    }
    
    const url = URL.createObjectURL(currentJpgBlob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = currentFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage('✅ فایل JPG با موفقیت دانلود شد: ' + currentFileName, 'success');
}

// دانلود فایل SVG (جداگانه)
function downloadOriginalSVG() {
    if (!currentSvgContent) {
        showMessage('❌ ابتدا فایل SVG را تولید کنید', 'warning');
        return;
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `فرم-تحویل-${timestamp}.svg`;
    
    const blob = new Blob([currentSvgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage('✅ فایل SVG با موفقیت دانلود شد: ' + filename, 'success');
}

// اشتراک‌گذاری فایل JPG
function shareSVG() {
    if (!currentJpgBlob) {
        showMessage('❌ ابتدا فایل JPG را تولید کنید', 'warning');
        return;
    }
    
    if (navigator.share) {
        const file = new File([currentJpgBlob], currentFileName, { type: 'image/jpeg' });
        
        navigator.share({
            title: 'فرم درخواست تحویل کالا',
            text: 'این فرم تحویل کالا را بررسی کنید',
            files: [file]
        }).then(() => {
            showMessage('✅ فایل JPG با موفقیت به اشتراک گذاشته شد', 'success');
        }).catch(error => {
            if (error.name !== 'AbortError') {
                showMessage('اشتراک‌گذاری لغو شد یا پشتیبانی نمی‌شود', 'info');
            }
        });
    } else {
        showMessage('❌ مرورگر شما از قابلیت اشتراک‌گذاری فایل پشتیبانی نمی‌کند. لطفاً از دانلود استفاده کنید.', 'warning');
    }
}

// کپی تصویر JPG به کلیپ‌بورد
async function copySVG() {
    if (!currentJpgBlob) {
        showMessage('❌ ابتدا فایل JPG را تولید کنید', 'warning');
        return;
    }
    
    try {
        // تبدیل blob به data URL
        const dataUrl = await blobToDataURL(currentJpgBlob);
        
        // ایجاد یک المان موقت برای کپی
        const img = document.createElement('img');
        img.src = dataUrl;
        
        // ایجاد canvas از تصویر
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            // تبدیل canvas به blob و کپی به کلیپ‌بورد
            canvas.toBlob(async function(blob) {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({
                            'image/png': blob
                        })
                    ]);
                    showMessage('✅ تصویر JPG با موفقیت کپی شد', 'success');
                } catch (err) {
                    showMessage('❌ خطا در کپی کردن تصویر', 'warning');
                }
            });
        };
        
    } catch (err) {
        showMessage('❌ خطا در کپی کردن تصویر. لطفاً از دکمه دانلود استفاده کنید.', 'danger');
        console.error('خطای کپی:', err);
    }
}

// تبدیل blob به data URL
function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function() {
            resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// چاپ فرم
function printForm() {
    const formData = collectFormData();
    
    if (!validateForm(formData)) {
        return;
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html dir="rtl">
        <head>
            <title>چاپ فرم تحویل - شماره ${formData.formNumber}</title>
            <style>
                @import url('https://cdn.jsdelivr.net/gh/rastikerdar/vazir-font@v30.1.0/dist/font-face.css');
                body { font-family: 'Vazir', sans-serif; padding: 20px; line-height: 1.8; }
                .form-header { display: flex; justify-content: space-between; align-items-center; margin-bottom: 20px; }
                h1 { color: #2c5aa0; border-bottom: 2px solid #2c5aa0; padding-bottom: 10px; }
                .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 10px; }
                table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                th { background: #2c5aa0; color: white; padding: 12px; text-align: right; }
                td { padding: 10px; border: 1px solid #ddd; text-align: right; }
                tr:nth-child(even) { background: #f8f9fa; }
                .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc; text-align: center; color: #666; }
                .form-number { background: #2c5aa0; color: white; padding: 5px 15px; border-radius: 5px; font-weight: bold; }
                @media print {
                    .no-print { display: none; }
                    body { font-size: 14px; }
                }
            </style>
        </head>
        <body>
            <div class="form-header">
                <h1>📦 فرم درخواست تحویل کالا</h1>
                <div class="form-number">شماره فرم: ${formData.formNumber}</div>
            </div>
            
            <div class="section">
                <h3>مشخصات مشتری</h3>
                <p><strong>خریدار:</strong> ${formData.buyer}</p>
                <p><strong>دریافت‌کننده:</strong> ${formData.receiver}</p>
                <p><strong>آدرس:</strong> ${formData.address}</p>
                <p><strong>کد پستی:</strong> ${formData.postalCode || 'ثبت نشده'}</p>
                <p><strong>تخفیف:</strong> ${formData.discount ? formData.discount + '%' : '۰%'}</p>
            </div>
            
            <div class="section">
                <h3>لیست محصولات</h3>
                <table>
                    <thead>
                        <tr>
                            <th>توضیحات</th>
                            <th>نوع دستگاه</th>
                            <th>تعداد</th>
                            <th>کمپرسور</th>
                            <th>یونیت داخلی</th>
                            <th>کلاس دمایی</th>
                            <th>برند</th>
                            <th>ظرفیت</th>
                            <th>ردیف</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${formData.products.map((p, i) => `
                        <tr>
                            <td>${p.description || ''}</td>
                            <td>${p.deviceType}</td>
                            <td>${p.qty}</td>
                            <td>${p.compressor}</td>
                            <td>${p.location}</td>
                            <td>${p.climate}</td>
                            <td>${p.brand}</td>
                            <td>${p.capacity}</td>
                            <td>${i + 1}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            ${formData.notes ? `
            <div class="section">
                <h3>یادداشت‌ها</h3>
                <p>${formData.notes.replace(/\n/g, '<br>')}</p>
            </div>
            ` : ''}
            
            <div class="footer">
                <p>تاریخ: ${formData.date} | ساعت: ${formData.time}</p>
                <p>تولید شده توسط اپلیکیشن فرم تحویل کالا</p>
            </div>
            
            <div class="no-print" style="margin-top: 20px;">
                <button onclick="window.print()">چاپ فرم</button>
                <button onclick="window.close()">بستن</button>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// ریست کردن فرم
function resetForm() {
    // ایجاد دکمه‌های مختلف برای ریست
    const resetChoice = confirm('کدام عمل را می‌خواهید انجام دهید؟\n\nOK: پاک کردن فرم فعلی\nCancel: بازنشانی شماره فرم به ۱');
    
    if (resetChoice === true) {
        // پاک کردن فرم فعلی
        if (confirm('آیا از پاک کردن تمام اطلاعات فرم فعلی اطمینان دارید؟')) {
            // پاک کردن فیلدهای ورودی
            document.getElementById('buyerName').value = '';
            document.getElementById('receiverName').value = '';
            document.getElementById('address').value = '';
            document.getElementById('postalCode').value = '';
            document.getElementById('discount').value = '';
            
            // تنظیم تاریخ امروز
            const today = new Date().toLocaleDateString('fa-IR');
            document.getElementById('notes').value = `تاریخ درخواست: ${today}`;
            
            // پاک کردن محصولات
            document.getElementById('productsContainer').innerHTML = '';
            
            // مخفی کردن پیش‌نمایش
            document.getElementById('previewSection').style.display = 'none';
            
            // پاک کردن ذخیره‌سازی محلی فرم
            localStorage.removeItem('deliveryFormData');
            
            // پاک کردن فایل‌های JPG
            currentJpgBlob = null;
            currentFileName = "";
            
            // ریست شمارنده محصولات
            productCount = 0;
            
            // اضافه کردن دو ردیف پیش‌فرض
            addProductRow();
            addProductRow();
            
            showMessage('✅ فرم با موفقیت پاک شد و به حالت اولیه بازگشت', 'success');
        }
    } else {
        // ریست شماره فرم
        resetFormNumber();
    }
}

// نمایش پیام
function showMessage(message, type) {
    const messageArea = document.getElementById('messageArea');
    
    // حذف پیام قبلی
    messageArea.innerHTML = '';
    
    // آیکون بر اساس نوع پیام
    const icons = {
        success: 'bi-check-circle-fill',
        danger: 'bi-exclamation-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        info: 'bi-info-circle-fill'
    };
    
    // ایجاد پیام جدید
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show d-flex align-items-center`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        <i class="bi ${icons[type] || 'bi-info-circle'} me-3 fs-5"></i>
        <div class="flex-grow-1">${message}</div>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="بستن"></button>
    `;
    
    messageArea.appendChild(alertDiv);
    
    // حذف خودکار پیام پس از 5 ثانیه (به جز پیام‌های خطر)
    if (type !== 'danger') {
        setTimeout(() => {
            if (alertDiv.parentNode) {
                const bsAlert = new bootstrap.Alert(alertDiv);
                bsAlert.close();
            }
        }, 5000);
    }
}

// تنظیم ذخیره خودکار
function setupAutoSave() {
    const inputs = document.querySelectorAll('#buyerName, #receiverName, #address, #postalCode, #discount, #notes');
    inputs.forEach(input => {
        input.addEventListener('input', saveToLocalStorage);
    });
}

// ذخیره در localStorage
function saveToLocalStorage() {
    const formData = collectFormData();
    localStorage.setItem('deliveryFormData', JSON.stringify(formData));
}

// بارگذاری داده‌های ذخیره شده
function loadSavedData() {
    const savedData = localStorage.getItem('deliveryFormData');
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            
            // پر کردن فیلدهای اصلی
            document.getElementById('buyerName').value = data.buyer || '';
            document.getElementById('receiverName').value = data.receiver || '';
            document.getElementById('address').value = data.address || '';
            document.getElementById('postalCode').value = data.postalCode || '';
            document.getElementById('discount').value = data.discount || '';
            document.getElementById('notes').value = data.notes || '';
            
            // پاک کردن ردیف‌های فعلی
            document.getElementById('productsContainer').innerHTML = '';
            productCount = 0;
            
            // اضافه کردن محصولات ذخیره شده
            if (data.products && data.products.length > 0) {
                data.products.forEach(() => {
                    addProductRow();
                });
                
                // پر کردن داده‌های محصولات
                const productRows = document.querySelectorAll('.product-row');
                data.products.forEach((product, index) => {
                    if (productRows[index]) {
                        const row = productRows[index];
                        if (product.brand) row.querySelector('.brand').value = product.brand;
                        if (product.capacity) row.querySelector('.capacity').value = product.capacity;
                        if (product.climate) row.querySelector('.climate').value = product.climate;
                        if (product.compressor) row.querySelector('.compressor').value = product.compressor;
                        if (product.location) row.querySelector('.location').value = product.location;
                        if (product.deviceType) row.querySelector('.deviceType').value = product.deviceType;
                        if (product.qty) row.querySelector('.qty').value = product.qty;
                        if (product.description && row.querySelector('.description')) {
                            row.querySelector('.description').value = product.description;
                        }
                    }
                });
                
                updateProductNumbers();
                showMessage('داده‌های ذخیره شده با موفقیت بارگذاری شدند', 'success');
            }
        } catch (e) {
            console.error('خطا در بارگذاری داده‌های ذخیره شده:', e);
            localStorage.removeItem('deliveryFormData');
        }
    }
}