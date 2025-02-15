document.addEventListener('DOMContentLoaded', function() {
    const publicationContainer = document.getElementById('publications-container');
    
    fetch('/bello.bib?v=' + new Date().getTime())
        .then(response => response.text())
        .then(data => {
            const publications = parseBibtex(data);
            renderPublications(publications);
        })
        .catch(error => {
            console.error('Error loading publications:', error);
            publicationContainer.innerHTML = '<div class="error-message">Error loading publications. Please try again later.</div>';
        });

    function parseBibtex(bibtex) {
        const entries = [];
        const entryRegex = /@(\w+)\s*{\s*([^,]*),([^@]*)/g;
        const fieldRegex = /(\w+)\s*=\s*{([^}]*)}/g;

        let match;
        while ((match = entryRegex.exec(bibtex)) !== null) {
            const type = match[1];
            const key = match[2];
            const content = match[3];
            
            const entry = { type, key };
            let fieldMatch;
            
            while ((fieldMatch = fieldRegex.exec(content)) !== null) {
                entry[fieldMatch[1]] = fieldMatch[2];
            }
            
            entries.push(entry);
        }
        
        return entries.sort((a, b) => (b.year || 0) - (a.year || 0));
    }

    function renderPublications(publications) {
        const years = [...new Set(publications.map(pub => pub.year))].sort((a, b) => b - a);
        
        years.forEach(year => {
            const yearSection = document.createElement('div');
            yearSection.className = 'publication-year';
            
            const yearHeader = document.createElement('div');
            yearHeader.className = 'year-header';
            yearHeader.textContent = year;
            yearSection.appendChild(yearHeader);
            
            const yearPubs = publications.filter(pub => pub.year === year);
            yearPubs.forEach(pub => {
                const pubElement = createPublicationElement(pub);
                yearSection.appendChild(pubElement);
            });
            
            publicationContainer.appendChild(yearSection);
        });
    }

    function createPublicationElement(pub) {
        const article = document.createElement('div');
        article.className = 'publication-item';
        
        const mainContent = document.createElement('div');
        mainContent.className = 'publication-main';
        
        // Title with link if available
        const titleWrapper = document.createElement('div');
        titleWrapper.className = 'publication-title';
        
        if (pub.url_Proceedings || pub.url_Preprint) {
            const link = document.createElement('a');
            link.href = pub.url_Proceedings || pub.url_Preprint;
            link.target = '_blank';
            link.textContent = pub.title;
            titleWrapper.appendChild(link);
        } else {
            titleWrapper.textContent = pub.title;
        }
        
        // Authors
        const authors = document.createElement('div');
        authors.className = 'publication-authors';
        authors.textContent = pub.author.split(" and ").join("; ");
        
        // Venue with custom styling for conference names
        const venue = document.createElement('div');
        venue.className = 'publication-venue';
        venue.innerHTML = pub.journal;
        
        // Links section
        const links = document.createElement('div');
        links.className = 'publication-links';
        
        if (pub.url_Proceedings) {
            addLink(links, 'Proceedings', pub.url_Proceedings);
        }
        if (pub.url_Preprint) {
            addLink(links, 'Preprint', pub.url_Preprint);
        }
        if (pub.url_Code) {
            addLink(links, 'Code', pub.url_Code);
        }
        
        // Abstract (hidden by default)
        if (pub.abstract) {
            const abstractWrapper = document.createElement('div');
            abstractWrapper.className = 'abstract-wrapper';
            
            const abstractToggle = document.createElement('button');
            abstractToggle.className = 'abstract-toggle';
            abstractToggle.textContent = 'Show Abstract';
            
            const abstractContent = document.createElement('div');
            abstractContent.className = 'abstract-content';
            abstractContent.textContent = pub.abstract;
            abstractContent.style.display = 'none';
            
            abstractToggle.addEventListener('click', () => {
                const isVisible = abstractContent.style.display === 'block';
                abstractContent.style.display = isVisible ? 'none' : 'block';
                abstractToggle.textContent = isVisible ? 'Show Abstract' : 'Hide Abstract';
                abstractToggle.classList.toggle('active');
            });
            
            abstractWrapper.appendChild(abstractToggle);
            abstractWrapper.appendChild(abstractContent);
            links.appendChild(abstractWrapper);
        }
        
        mainContent.appendChild(titleWrapper);
        mainContent.appendChild(authors);
        mainContent.appendChild(venue);
        mainContent.appendChild(links);
        
        article.appendChild(mainContent);
        return article;
    }

    function addLink(container, text, url) {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.className = 'publication-link';
        link.textContent = text;
        container.appendChild(link);
    }
}); 