export class Carousel {
    static init(id) {
        const container = document.getElementById(id);
        if(!container) return;
        
        const track = container.querySelector('.carousel-track');
        const slides = track.querySelectorAll('.carousel-slide');
        if(slides.length === 0) return;
        
        let idx = 0;
        const move = (dir) => {
            idx = (idx + dir + slides.length) % slides.length;
            track.style.transform = `translateX(-${idx * 100}%)`;
        };

        const nextBtn = container.querySelector('.next');
        const prevBtn = container.querySelector('.prev');
        
        if(nextBtn) nextBtn.onclick = () => move(1);
        if(prevBtn) prevBtn.onclick = () => move(-1);
        
        // Autoplay cada 4 segundos
        setInterval(() => move(1), 4000);
    }
}