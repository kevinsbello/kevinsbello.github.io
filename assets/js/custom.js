document.addEventListener('DOMContentLoaded', function() {
  const newsToggle = document.querySelector('.news-toggle');
  const newsExpanded = document.querySelector('.news-expanded');
  
  if (newsToggle && newsExpanded) {
    newsToggle.addEventListener('click', function() {
      newsExpanded.classList.toggle('show');
      newsToggle.classList.toggle('active');
      
      if (newsExpanded.classList.contains('show')) {
        newsToggle.innerHTML = '<i class="fas fa-chevron-up"></i> Show Less';
      } else {
        newsToggle.innerHTML = '<i class="fas fa-chevron-down"></i> View More Updates';
      }
    });
  }
}); 