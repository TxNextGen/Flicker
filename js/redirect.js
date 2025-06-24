
(function() {
    'use strict';
    
    function isMobileDevice() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        
  
        const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet|kindle|silk|playbook|bb10|windows phone|android|bb\d+|meego|avantgo|bada\/|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i;
        
       
        const screenWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        const isMobileScreen = screenWidth <= 768;
        
    
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
        

        const hasMobileFeatures = /mobi|android/i.test(userAgent) || isTouchDevice;
        
        return mobileRegex.test(userAgent) || (isMobileScreen && hasMobileFeatures);
    }
    

    function shouldRedirectToMobile() {
 
        if (window.location.pathname.includes('mobile.html') || window.location.pathname.endsWith('mobile.html')) {
            return false;
        }
        
   
        if (localStorage.getItem('forceDesktop') === 'true') {
            return false;
        }
        
      
        if (document.referrer && document.referrer.includes('mobile.html')) {
            return false;
        }
        

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('desktop') === 'true') {
            localStorage.setItem('forceDesktop', 'true');
            return false;
        }
        
        return isMobileDevice();
    }
    
  
    function createTransitionOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'mobile-redirect-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            z-index: 99999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            font-family: 'Raleway', sans-serif;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        overlay.innerHTML = `
            <div style="text-align: center;">
                <div style="width: 50px; height: 50px; margin: 0 auto 20px;">
                    <div style="width: 50px; height: 50px; border: 3px solid rgba(255,255,255,0.3); border-top: 3px solid white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                </div>
                <h3 style="margin: 0 0 10px 0; font-weight: 600;">Optimizing for Mobile</h3>
                <p style="margin: 0; opacity: 0.8; font-size: 0.9rem;">Redirecting to mobile experience...</p>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        
        document.body.appendChild(overlay);
        

        setTimeout(() => {
            overlay.style.opacity = '1';
        }, 10);
        
        return overlay;
    }
    

    function redirectToMobile() {
        if (window.redirecting) return;
        window.redirecting = true;
        
        
        const overlay = createTransitionOverlay();
        

        setTimeout(() => {
            const currentURL = window.location;
            const mobileURL = currentURL.origin + currentURL.pathname.replace(/\/[^\/]*$/, '/mobile.html') + currentURL.search + currentURL.hash;
            
  
            window.location.href = mobileURL;
        }, 800);
    }
    

    function addDesktopVersionButton() {
        if (!isMobileDevice()) return;
        
        const button = document.createElement('button');
        button.id = 'desktop-version-btn';
        button.textContent = 'Desktop Version';
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.3);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-family: 'Raleway', sans-serif;
            cursor: pointer;
            z-index: 1000;
            transition: all 0.2s ease;
            backdrop-filter: blur(10px);
        `;
        
        button.addEventListener('click', () => {
            localStorage.setItem('forceDesktop', 'true');
            location.reload();
        });
        
        button.addEventListener('mouseenter', () => {
            button.style.background = 'rgba(255, 255, 255, 0.2)';
            button.style.transform = 'scale(1.05)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.background = 'rgba(255, 255, 255, 0.1)';
            button.style.transform = 'scale(1)';
        });
        
        document.body.appendChild(button);
    }
    
    function init() {
        if (shouldRedirectToMobile()) {
            redirectToMobile();
        } else if (isMobileDevice() && !window.location.pathname.includes('mobile.html')) {
            setTimeout(addDesktopVersionButton, 1000);
        }
    }
    

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    setTimeout(init, 0);
    

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (shouldRedirectToMobile() && !window.redirecting) {
                redirectToMobile();
            }
        }, 500);
    });
    

    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            if (shouldRedirectToMobile() && !window.redirecting) {
                redirectToMobile();
            }
        }, 500);
    });
    

    window.FlickerMobileRedirect = {
        isMobile: isMobileDevice,
        forceDesktop: () => {
            localStorage.setItem('forceDesktop', 'true');
            location.reload();
        },
        forceMobile: () => {
            localStorage.removeItem('forceDesktop');
            if (isMobileDevice()) {
                redirectToMobile();
            }
        }
    };
    
})();