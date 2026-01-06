// Membership System JavaScript

// ============================================
// Index Page - New Member Button Handler
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const newMemberBtn = document.getElementById('newMemberBtn');
    
    if (newMemberBtn) {
        newMemberBtn.addEventListener('click', function() {
            // Navigate to payment portal
            window.location.href = 'payment.html';
        });
    }
    
    // ============================================
    // Payment Page - Form and Payment Handling
    // ============================================
    const memberForm = document.getElementById('memberForm');
    const paymentBtns = document.querySelectorAll('.payment-btn');
    const paymentStatus = document.getElementById('paymentStatus');
    const backBtn = document.getElementById('backBtn');
    
    if (memberForm) {
        // Handle form submission prevention
        memberForm.addEventListener('submit', function(e) {
            e.preventDefault();
        });
    }
    
    // Handle payment button clicks
    if (paymentBtns.length > 0) {
        paymentBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                // Validate form first
                const name = document.getElementById('memberName').value.trim();
                const age = document.getElementById('memberAge').value.trim();
                const mobile = document.getElementById('memberMobile').value.trim();
                const address = document.getElementById('memberAddress').value.trim();
                
                if (!name || !age || !mobile || !address) {
                    alert('Please fill in all required fields (Name, Age, Mobile Number, and Address) before proceeding with payment.');
                    return;
                }
                
                // Validate mobile number
                if (mobile.length !== 10 || !/^[0-9]{10}$/.test(mobile)) {
                    alert('Please enter a valid 10-digit mobile number.');
                    return;
                }
                
                // Get selected payment method
                const paymentMethod = this.getAttribute('data-method');
                
                // If GPay or PhonePe is selected, show QR code modal
                if (paymentMethod === 'GPay') {
                    showQRCodeModal(name, age, mobile, address, 'GPay');
                } else if (paymentMethod === 'PhonePe') {
                    showQRCodeModal(name, age, mobile, address, 'PhonePe');
                } else if (paymentMethod === 'Card Payment') {
                    // Show card payment form
                    showCardPaymentForm(name, age, mobile, address);
                } else {
                    // For other payment methods, proceed directly
                    processPayment(name, age, mobile, address, paymentMethod);
                }
            });
        });
    }
    
    // QR Code Modal handlers
    const qrCodeModal = document.getElementById('qrCodeModal');
    const closeQrBtn = document.getElementById('closeQrBtn');
    const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
    const cancelPaymentBtn = document.getElementById('cancelPaymentBtn');
    
    // Function to reset QR modal to initial state
    function resetQRModal() {
        const qrCodeView = document.getElementById('qrCodeView');
        const paymentSuccessView = document.getElementById('paymentSuccessView');
        
        if (qrCodeView) {
            qrCodeView.classList.remove('hidden');
        }
        if (paymentSuccessView) {
            paymentSuccessView.classList.add('hidden');
        }
    }
    
    // Function to show QR code modal
    function showQRCodeModal(name, age, mobile, address, paymentMethod) {
        if (qrCodeModal) {
            // Reset modal to initial state
            resetQRModal();
            
            // Clear previous QR code if any
            const qrContainer = document.getElementById('qrcode');
            if (qrContainer) {
                qrContainer.innerHTML = '';
            }
            
            // Update modal title and instruction based on payment method
            const qrModalTitle = document.getElementById('qrModalTitle');
            const qrInstruction = document.getElementById('qrInstruction');
            
            if (paymentMethod === 'PhonePe') {
                if (qrModalTitle) qrModalTitle.textContent = 'Scan QR Code to Pay';
                if (qrInstruction) qrInstruction.textContent = 'Scan this QR code with your PhonePe app to complete the payment';
            } else {
                if (qrModalTitle) qrModalTitle.textContent = 'Scan QR Code to Pay';
                if (qrInstruction) qrInstruction.textContent = 'Scan this QR code with your GPay app to complete the payment';
            }
            
            // Generate UPI payment QR code data
            const upiId = 'mathisurendhar-2@okicici';
            const amount = '1';
            const payeeName = 'Ambalnagar Membership';
            const transactionNote = `Membership Payment - ${name}`;
            
            // UPI payment string format for QR code
            const qrData = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
            
            // Calculate responsive QR code size based on screen width
            const screenWidth = window.innerWidth;
            let qrSize = 256; // Default size
            
            if (screenWidth <= 480) {
                qrSize = Math.min(220, screenWidth - 80); // Smaller for mobile
            } else if (screenWidth <= 768) {
                qrSize = Math.min(240, screenWidth - 100); // Medium for tablets
            }
            
            // Generate QR code using QRCode.js library
            if (typeof QRCode !== 'undefined') {
                try {
                    new QRCode(qrContainer, {
                        text: qrData,
                        width: qrSize,
                        height: qrSize,
                        colorDark: '#000000',
                        colorLight: '#ffffff',
                        correctLevel: QRCode.CorrectLevel.H
                    });
                    
                    // Make the generated canvas responsive
                    setTimeout(function() {
                        const canvas = qrContainer.querySelector('canvas');
                        if (canvas) {
                            canvas.style.maxWidth = '100%';
                            canvas.style.height = 'auto';
                            canvas.style.width = '100%';
                        }
                    }, 100);
                } catch (e) {
                    // If QRCode API is different, try alternative
                    if (typeof qrcode !== 'undefined') {
                        qrcode.makeCode(qrData);
                    } else {
                        // Fallback: create a visual QR code placeholder
                        const fallbackSize = screenWidth <= 480 ? '200px' : '256px';
                        const appName = paymentMethod === 'PhonePe' ? 'PhonePe' : 'GPay';
                        qrContainer.innerHTML = `<div style="width:${fallbackSize};height:${fallbackSize};max-width:100%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;border:2px solid #ccc;border-radius:10px;flex-direction:column;margin:0 auto;"><div style="font-size:3em;margin-bottom:10px;">📱</div><p style="color:#666;font-size:0.9em;">${appName} QR Code</p><p style="color:#999;font-size:0.8em;margin-top:5px;">Scan to Pay</p></div>`;
                    }
                }
            } else {
                // Fallback if library didn't load
                const fallbackSize = screenWidth <= 480 ? '200px' : '256px';
                const appName = paymentMethod === 'PhonePe' ? 'PhonePe' : 'GPay';
                qrContainer.innerHTML = `<div style="width:${fallbackSize};height:${fallbackSize};max-width:100%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;border:2px solid #ccc;border-radius:10px;flex-direction:column;margin:0 auto;"><div style="font-size:3em;margin-bottom:10px;">📱</div><p style="color:#666;font-size:0.9em;">${appName} QR Code</p><p style="color:#999;font-size:0.8em;margin-top:5px;">Scan to Pay</p></div>`;
            }
            
            // Show modal
            qrCodeModal.classList.remove('hidden');
            
            // Store form data for later use
            qrCodeModal.dataset.name = name;
            qrCodeModal.dataset.age = age;
            qrCodeModal.dataset.mobile = mobile;
            qrCodeModal.dataset.address = address;
            qrCodeModal.dataset.paymentMethod = paymentMethod;
        }
    }
    
    // Function to show card payment form
    function showCardPaymentForm(name, age, mobile, address) {
        const cardPaymentModal = document.getElementById('cardPaymentModal');
        if (cardPaymentModal) {
            // Reset form
            const cardForm = document.getElementById('cardPaymentForm');
            if (cardForm) {
                cardForm.reset();
            }
            
            // Show modal
            cardPaymentModal.classList.remove('hidden');
            
            // Store form data for later use
            cardPaymentModal.dataset.name = name;
            cardPaymentModal.dataset.age = age;
            cardPaymentModal.dataset.mobile = mobile;
            cardPaymentModal.dataset.address = address;
        }
    }
    
    // Close QR modal
    if (closeQrBtn) {
        closeQrBtn.addEventListener('click', function() {
            if (qrCodeModal) {
                qrCodeModal.classList.add('hidden');
                resetQRModal();
            }
            // Re-enable payment buttons
            paymentBtns.forEach(b => {
                b.disabled = false;
                b.style.opacity = '1';
            });
        });
    }
    
    // Cancel payment
    if (cancelPaymentBtn) {
        cancelPaymentBtn.addEventListener('click', function() {
            if (qrCodeModal) {
                qrCodeModal.classList.add('hidden');
                resetQRModal();
            }
            // Re-enable payment buttons
            paymentBtns.forEach(b => {
                b.disabled = false;
                b.style.opacity = '1';
            });
        });
    }
    
    // Confirm payment after QR scan
    if (confirmPaymentBtn) {
        confirmPaymentBtn.addEventListener('click', function() {
            if (qrCodeModal) {
                const name = qrCodeModal.dataset.name;
                const age = qrCodeModal.dataset.age;
                const mobile = qrCodeModal.dataset.mobile;
                const address = qrCodeModal.dataset.address;
                const paymentMethod = qrCodeModal.dataset.paymentMethod || 'GPay';
                
                // Update success message with payment method
                const successPaymentMethod = document.getElementById('successPaymentMethod');
                if (successPaymentMethod) {
                    successPaymentMethod.textContent = `Payment Method: ${paymentMethod}`;
                }
                
                // Show payment success screen
                showPaymentSuccess();
                
                // Process payment and redirect after a short delay
                setTimeout(function() {
                    processPayment(name, age, mobile, address, paymentMethod);
                }, 2000);
            }
        });
    }
    
    // Card Payment Modal handlers
    const cardPaymentModal = document.getElementById('cardPaymentModal');
    const closeCardBtn = document.getElementById('closeCardBtn');
    const cardPaymentForm = document.getElementById('cardPaymentForm');
    const cancelCardBtn = document.getElementById('cancelCardBtn');
    
    // Close card payment modal
    if (closeCardBtn) {
        closeCardBtn.addEventListener('click', function() {
            if (cardPaymentModal) {
                cardPaymentModal.classList.add('hidden');
            }
            // Re-enable payment buttons
            paymentBtns.forEach(b => {
                b.disabled = false;
                b.style.opacity = '1';
            });
        });
    }
    
    // Cancel card payment
    if (cancelCardBtn) {
        cancelCardBtn.addEventListener('click', function() {
            if (cardPaymentModal) {
                cardPaymentModal.classList.add('hidden');
            }
            // Re-enable payment buttons
            paymentBtns.forEach(b => {
                b.disabled = false;
                b.style.opacity = '1';
            });
        });
    }
    
    // Handle card payment form submission
    if (cardPaymentForm) {
        cardPaymentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get card details
            const cardNumber = document.getElementById('cardNumber').value.trim();
            const expiryDate = document.getElementById('expiryDate').value.trim();
            const cvv = document.getElementById('cvv').value.trim();
            const cardHolderName = document.getElementById('cardHolderName').value.trim();
            
            // Basic validation
            if (!cardNumber || !expiryDate || !cvv || !cardHolderName) {
                alert('Please fill in all card details.');
                return;
            }
            
            // Validate card number (basic check - 16 digits)
            const cardNumberDigits = cardNumber.replace(/\s/g, '');
            if (cardNumberDigits.length < 16 || cardNumberDigits.length > 19) {
                alert('Please enter a valid card number.');
                return;
            }
            
            // Validate expiry date format
            if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
                alert('Please enter expiry date in MM/YY format.');
                return;
            }
            
            // Validate CVV
            if (cvv.length < 3 || cvv.length > 4) {
                alert('Please enter a valid CVV.');
                return;
            }
            
            // Get member data
            const name = cardPaymentModal.dataset.name;
            const age = cardPaymentModal.dataset.age;
            const mobile = cardPaymentModal.dataset.mobile;
            const address = cardPaymentModal.dataset.address;
            
            // Close modal
            if (cardPaymentModal) {
                cardPaymentModal.classList.add('hidden');
            }
            
            // Process payment
            processPayment(name, age, mobile, address, 'Card Payment');
        });
    }
    
    // Format card number input
    const cardNumberInput = document.getElementById('cardNumber');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\s/g, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            e.target.value = formattedValue;
        });
    }
    
    // Format expiry date input
    const expiryDateInput = document.getElementById('expiryDate');
    if (expiryDateInput) {
        expiryDateInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value;
        });
    }
    
    // Only allow numbers for CVV
    const cvvInput = document.getElementById('cvv');
    if (cvvInput) {
        cvvInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    }
    
    // Format mobile number input (only numbers, max 10 digits)
    const memberMobileInput = document.getElementById('memberMobile');
    if (memberMobileInput) {
        memberMobileInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/\D/g, '').substring(0, 10);
        });
    }
    
    // Function to show payment success screen
    function showPaymentSuccess() {
        const qrCodeView = document.getElementById('qrCodeView');
        const paymentSuccessView = document.getElementById('paymentSuccessView');
        
        if (qrCodeView && paymentSuccessView) {
            // Hide QR code view
            qrCodeView.classList.add('hidden');
            // Show success view
            paymentSuccessView.classList.remove('hidden');
        }
    }
    
    // View Receipt button handler
    const viewReceiptBtn = document.getElementById('viewReceiptBtn');
    if (viewReceiptBtn) {
        viewReceiptBtn.addEventListener('click', function() {
            // Close modal and redirect will happen via processPayment
            if (qrCodeModal) {
                qrCodeModal.classList.add('hidden');
            }
        });
    }
    
    // Function to process payment
    function processPayment(name, age, mobile, address, paymentMethod) {
        // Close QR modal if still open
        if (qrCodeModal) {
            qrCodeModal.classList.add('hidden');
        }
        
        // Disable all payment buttons
        paymentBtns.forEach(b => {
            b.disabled = true;
            b.style.opacity = '0.6';
        });
        
        // Show payment status
        if (paymentStatus) {
            paymentStatus.classList.remove('hidden');
        }
        
        // Simulate payment processing (2-3 seconds delay)
        setTimeout(function() {
            // Store member data in localStorage
            const memberData = {
                name: name,
                age: age,
                mobile: mobile,
                address: address,
                paymentMethod: paymentMethod,
                date: new Date().toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                membershipId: 'AMB-' + Date.now().toString().slice(-8),
                paymentSuccess: true
            };
            
            localStorage.setItem('memberData', JSON.stringify(memberData));
            
            // Redirect to receipt page
            window.location.href = 'receipt.html';
        }, 2500);
    }
    
    // Handle back button
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            window.location.href = 'index.html';
        });
    }
    
    // ============================================
    // Receipt Page - Display Data and Actions
    // ============================================
    const receiptName = document.getElementById('receiptName');
    const receiptAge = document.getElementById('receiptAge');
    const receiptMobile = document.getElementById('receiptMobile');
    const receiptAddress = document.getElementById('receiptAddress');
    const receiptPayment = document.getElementById('receiptPayment');
    const receiptDate = document.getElementById('receiptDate');
    const receiptId = document.getElementById('receiptId');
    const printBtn = document.getElementById('printBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const homeBtn = document.getElementById('homeBtn');
    
    // Load and display member data
    if (receiptName) {
        const memberData = JSON.parse(localStorage.getItem('memberData'));
        
        if (memberData) {
            receiptName.textContent = memberData.name;
            receiptAge.textContent = memberData.age;
            if (receiptMobile) {
                receiptMobile.textContent = memberData.mobile || '-';
            }
            receiptAddress.textContent = memberData.address;
            receiptPayment.textContent = memberData.paymentMethod;
            receiptDate.textContent = memberData.date;
            receiptId.textContent = memberData.membershipId;
            
            // Show "Join the Community" message and buttons only after payment success
            if (memberData.paymentSuccess) {
                const communityMessage = document.getElementById('communityMessage');
                if (communityMessage) {
                    communityMessage.classList.remove('hidden');
                }
                
                // Show print button only after payment success
                if (printBtn) {
                    printBtn.classList.remove('hidden');
                }
                
                // Show download button only after payment success
                if (downloadBtn) {
                    downloadBtn.classList.remove('hidden');
                }
            }
        } else {
            // If no data found, redirect to home
            alert('No membership data found. Redirecting to home page.');
            window.location.href = 'index.html';
        }
    }
    
    // Handle print button
    if (printBtn) {
        printBtn.addEventListener('click', function() {
            window.print();
        });
    }
    
    // Handle download button
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            const memberData = JSON.parse(localStorage.getItem('memberData'));
            
            if (!memberData) {
                alert('No membership data found.');
                return;
            }
            
            // Generate receipt content
            const receiptContent = generateReceiptContent(memberData);
            
            // Create downloadable file
            const blob = new Blob([receiptContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Membership_Receipt_${memberData.membershipId}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }
    
    // Handle home button
    if (homeBtn) {
        homeBtn.addEventListener('click', function() {
            window.location.href = 'index.html';
        });
    }
});

// ============================================
// Receipt Generation Function
// ============================================
function generateReceiptContent(memberData) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Membership Receipt - ${memberData.membershipId}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 40px;
            background: white;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #667eea;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #667eea;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        .details {
            margin: 30px 0;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 15px 0;
            border-bottom: 1px solid #f0f0f0;
        }
        .detail-label {
            font-weight: 600;
            color: #666;
        }
        .detail-value {
            color: #333;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #f0f0f0;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Welcome to Ambalnagar</h1>
        <p>Membership Registration Receipt</p>
    </div>
    <div class="details">
        <div class="detail-row">
            <span class="detail-label">Member Name:</span>
            <span class="detail-value">${memberData.name}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Age:</span>
            <span class="detail-value">${memberData.age}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Mobile Number:</span>
            <span class="detail-value">${memberData.mobile || '-'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Address:</span>
            <span class="detail-value">${memberData.address}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Payment Method:</span>
            <span class="detail-value">${memberData.paymentMethod}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Date:</span>
            <span class="detail-value">${memberData.date}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Membership ID:</span>
            <span class="detail-value">${memberData.membershipId}</span>
        </div>
    </div>
    <div class="footer">
        <p>Thank you for joining Ambalnagar!</p>
        <p>This is your official membership receipt. Please keep it for your records.</p>
    </div>
</body>
</html>`;
}

