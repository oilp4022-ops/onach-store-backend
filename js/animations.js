export class Animations {
    // Botones Magnéticos (Práctica 2)
    static initMagneticButtons() {
        document.querySelectorAll('.button, .btn-detail-add').forEach(btn => {
            btn.addEventListener('mousemove', e => {
                const rect = btn.getBoundingClientRect();
                const x = (e.clientX - rect.left - rect.width / 2) * 0.2;
                const y = (e.clientY - rect.top - rect.height / 2) * 0.2;
                btn.style.transform = `translate(${x}px, ${y}px)`;
            });
            btn.addEventListener('mouseleave', () => btn.style.transform = 'translate(0,0)');
        });
    }

    // Revelar al hacer scroll (Intersection Observer)
    static initScrollObserver() {
        const obs = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if(e.isIntersecting) {
                    e.target.style.opacity = 1;
                    e.target.style.transform = 'translateY(0)';
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.feature-card, .product-card').forEach(el => {
            el.style.opacity = 0;
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'all 0.6s ease-out';
            obs.observe(el);
        });
    }
}