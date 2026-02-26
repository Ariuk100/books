import './style.css'

let bookStructure = null;
let currentChapter = null;

const sidebarContent = document.querySelector('#toc');
const bookContainer = document.querySelector('#book-content');
const chapterTitle = document.querySelector('#chapter-title');
const sidebar = document.querySelector('#sidebar');
const sidebarToggle = document.querySelector('#sidebar-toggle');
const sidebarOverlay = document.querySelector('#sidebar-overlay');
const sidebarClose = document.querySelector('#sidebar-close');

function openMobileSidebar() {
  sidebar.classList.add('active');
  sidebarOverlay.classList.add('active');
}

function closeMobileSidebar() {
  sidebar.classList.remove('active');
  sidebarOverlay.classList.remove('active');
}

// Initialize the app
async function init() {
  try {
    // Sidebar toggle logic
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (isCollapsed) sidebar.classList.add('collapsed');

    sidebarToggle.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        // Утсан дээр: overlay + active
        if (sidebar.classList.contains('active')) {
          closeMobileSidebar();
        } else {
          openMobileSidebar();
        }
      } else {
        // Desktop дээр: collapsed логик
        sidebar.classList.toggle('collapsed');
        localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
      }
    });

    // Overlay дарахад хаагдана
    sidebarOverlay.addEventListener('click', closeMobileSidebar);

    // X товч дарахад хаагдана
    if (sidebarClose) {
      sidebarClose.addEventListener('click', closeMobileSidebar);
    }

    // Collapse All Logic
    const collapseAllBtn = document.getElementById('collapse-all-btn');
    if (collapseAllBtn) {
        collapseAllBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const expandedItems = sidebarContent.querySelectorAll('.expanded');
            expandedItems.forEach(item => item.classList.remove('expanded'));
        });
    }

    const baseUrl = import.meta.env.BASE_URL;
    const response = await fetch(`${baseUrl}data/library.json?v=${Date.now()}`);
    bookStructure = await response.json();
    
    renderSidebar();
    
    // Load home page by default
    loadHomePage();
    
    // Make logo click go to home page
    const logo = document.querySelector('.logo');
    if (logo) {
      logo.style.cursor = 'pointer';
      logo.addEventListener('click', (e) => {
        if (e.target.closest('#collapse-all-btn') || e.target.closest('#sidebar-close')) return;
        loadHomePage();
        if (window.innerWidth <= 768) {
            closeMobileSidebar();
        }
      });
    }
  } catch (error) {
    console.error('Failed to initialize app:', error);
    if (bookContainer) bookContainer.innerHTML = '<p class="error">Failed to load content. Please check console.</p>';
  }
}

function renderSidebar() {
  if (!sidebarContent) return;
  sidebarContent.innerHTML = '';
  if (!bookStructure.books) return;
  
  bookStructure.books.forEach(book => {
    // Book Container
    const bookEl = document.createElement('div');
    bookEl.className = 'book-group';
    
    // Book Header
    const bookHeader = document.createElement('div');
    bookHeader.className = 'book-header';
    // Add SVG Icon
    const iconSvg = `<svg class="book-icon" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
    
    bookHeader.innerHTML = `${iconSvg} <h2 class="book-title-text">${book.title}</h2>`;
    bookHeader.onclick = () => {
        const isExpanded = bookEl.classList.contains('expanded');
        // Бусад бүх номыг хаана
        sidebarContent.querySelectorAll('.book-group').forEach(el => el.classList.remove('expanded'));
        // Өмнө хаалттай байсан бол нээнэ
        if (!isExpanded) {
            bookEl.classList.add('expanded');
        }
    };
    bookEl.appendChild(bookHeader); // Add header to book container

    // Chapters Container
    const chaptersContainer = document.createElement('div');
    chaptersContainer.className = 'book-chapters';

    book.chapters.forEach((chapter, index) => {
      const chapterEl = document.createElement('div');
      chapterEl.className = 'sidebar-item chapter-link';
      chapterEl.dataset.id = chapter.id;
      
      // Auto-numbering: index + 1
      const chapterNum = `${index + 1}.`;
      const chapterName = chapter.title;

      const headerEl = document.createElement('div');
      headerEl.className = 'chapter-header';
      headerEl.innerHTML = `<h3><span class="ch-num">${chapterNum}</span> <span>${chapterName}</span></h3>`;
      headerEl.onclick = (e) => {
          const isActive = chapterEl.classList.contains('expanded');
          // Close other chapters in this book
          chaptersContainer.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('expanded'));
          if (!isActive) {
              chapterEl.classList.add('expanded');
          }
      };
      chapterEl.appendChild(headerEl);
      
      if (chapter.sections) {
        const sectionsList = document.createElement('ul');
        sectionsList.className = 'chapter-sections';
        
        chapter.sections.forEach(section => {
          const sectionItem = document.createElement('li');
          sectionItem.className = 'section-link';
          sectionItem.dataset.id = section.id;
          
          const match = section.title.match(/^(§\s*\d+\.\d+\.?|\d+\.\d+\.?)\s*(.*)$/);
          const num = match ? match[1] : (section.id.includes('problems') ? '?' : '');
          const title = match ? match[2] : section.title;

          // Checking if it's the new Problems book
          if (book.id === 'irodov_problems') {
               sectionItem.classList.add('is-problems-section');
          }

          sectionItem.innerHTML = `<span class="sec-num">${num}</span><span class="sec-title">${title}</span>`;
          sectionItem.onclick = (e) => {
            e.stopPropagation();
            loadChapter(book, chapter.id, section.id);
            if (window.innerWidth <= 768) closeMobileSidebar();
          };
          sectionsList.appendChild(sectionItem);
        });
        chapterEl.appendChild(sectionsList);
      }
      chaptersContainer.appendChild(chapterEl);
    });
    
    bookEl.appendChild(chaptersContainer);
    sidebarContent.appendChild(bookEl);
    
    // Auto-expand first book removed intentionally so all stay closed
  });
}

function loadHomePage() {
  currentChapter = null;
  if (chapterTitle) chapterTitle.textContent = "Физикийн Номын Сан";

  // Deselect active items in sidebar
  document.querySelectorAll('.section-link.active').forEach(item => item.classList.remove('active'));
  document.querySelectorAll('.sidebar-item.active-chapter').forEach(item => item.classList.remove('active-chapter'));

  let html = `
    <div class="home-page">
      <div class="home-header-content">
        <h2>Тавтай морилно уу!</h2>
        <p>И.Е. Иродовын болон бусад физикийн сурах бичиг, бодлогын хураамжуудаас сонгон уншина уу. Энэхүү цахим номын сан нь физикийн шинжлэх ухааныг гүнзгийрүүлэн судлахад тань туслах зорилготой.</p>
      </div>
      <div class="book-grid">
  `;

  if (bookStructure && bookStructure.books) {
    bookStructure.books.forEach(book => {
      let clickHandler = `onclick="const h = document.querySelector('.sidebar-item[data-id=\\'${book.chapters[0]?.id}\\'] .chapter-header'); if(h) h.click(); document.querySelector('.sidebar-item[data-id=\\'${book.chapters[0]?.id}\\'] .section-link').click();"`;

      html += `
        <div class="book-card" ${clickHandler}>
          <div class="book-card-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none" class="text-primary"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
          </div>
          <h3 class="book-card-title">${book.title}</h3>
          <p class="book-card-desc">${book.chapters.length} бүлэгтэй</p>
        </div>
      `;
    });
  }

  html += `
      </div>
    </div>
  `;
  if (bookContainer) bookContainer.innerHTML = html;
}

async function loadChapter(book, chapterId, sectionId = null) {
  try {
    const chapterInfo = book.chapters.find(c => c.id === chapterId);
    if (!chapterInfo) return;

    // Determine what file to load
    let fileToLoad = null;

    const baseUrl = import.meta.env.BASE_URL;
    if (chapterInfo.folder && sectionId) {
      const section = chapterInfo.sections.find(s => s.id === sectionId);
      if (section && section.file) {
        fileToLoad = `${baseUrl}data/${chapterInfo.folder}/${section.file}`;
      }
    } else if (chapterInfo.file) {
        fileToLoad = `${baseUrl}data/chapters/${chapterInfo.file}`;
    } else if (chapterInfo.folder && !sectionId && chapterInfo.sections.length > 0) {
        const firstSec = chapterInfo.sections[0];
        fileToLoad = `${baseUrl}data/${chapterInfo.folder}/${firstSec.file}`;
        sectionId = firstSec.id;
    }

    // Identify if this is the "Problems" section for styling
    if (!fileToLoad) {
        console.warn("No file content mapped for this section.");
        // Optional: notify user visually if clicking unfinished sections
        if (sectionId) alert("Энэ хэсгийн агуулга одоогоор бэлэн болоогүй байна.");
        return;
    }

    // Identify if this is the "Problems" section for styling
    document.getElementById('book-content').className = '';

    const response = await fetch(fileToLoad);
    const data = await response.json();
    currentChapter = { ...chapterInfo, ...data }; 
    
    renderContent(data);
    
    // Highlight sidebar
    updateSidebarActiveState(chapterId, sectionId);

    // Scroll logic
    setTimeout(() => {
       window.scrollTo({ top: 0, behavior: 'smooth' });
       
      if (window.MathJax) {
        window.MathJax.typesetPromise();
      }
    }, 100);

  } catch (error) {
    console.error('Failed to load chapter:', error);
  }
}

function updateSidebarActiveState(chapterId, sectionId) {
    document.querySelectorAll('.section-link').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active-chapter'));
    
    const chEl = document.querySelector(`.sidebar-item[data-id="${chapterId}"]`);
    if (chEl) {
        chEl.classList.add('active-chapter');
        // Ensure it's expanded
        chEl.classList.add('expanded');
    }

    if (sectionId) {
        // Find specifically within the active chapter if possible, or global query
        const secEl = chEl ? chEl.querySelector(`.section-link[data-id="${sectionId}"]`) : null;
        if (secEl) secEl.classList.add('active');
    }
}


function renderContent(data) {
  if (!bookContainer) return;
  if (chapterTitle) chapterTitle.textContent = data.title;
  bookContainer.innerHTML = '';
  
  data.body.forEach(item => {
    const el = createContentElement(item);
    if (el) bookContainer.appendChild(el);
  });
}

function createContentElement(item) {
  switch (item.type) {
    case 'text':
      const p = document.createElement('p');
      // Check for Solution/Bodolt start
      // Check for Solution/Bodolt start
      if (item.value.includes('Бодолт') || item.value.trim().startsWith('<b>Бодолт') || 
          item.value.includes('Шийдэл') || item.value.trim().startsWith('<b>Шийдэл')) {
          p.className = 'solution-text';
          p.innerHTML = formatText(item.value);
      } else {
          p.innerHTML = formatText(item.value);
      }
      return p;
    case 'header':
      const h2 = document.createElement('h2');
      if (item.id) h2.id = item.id;
      h2.textContent = item.value;
      return h2;
    case 'note':
      const div = document.createElement('div');
      div.className = 'note-box';
      div.innerHTML = formatText(item.value);
      return div;
    case 'problem':
      const problemDiv = document.createElement('div');
      problemDiv.className = 'problem-container';
      
      let problemHTML = `<div class="problem-header"><strong>${item.number || ''} ${item.title || ''}</strong></div>`;
      problemHTML += `<div class="problem-statement">${formatText(item.statement)}</div>`;
      
      if (item.image) {
        const baseUrl = import.meta.env.BASE_URL;
        let imgSrc = item.image.src;
        // If it starts with images/ or /, clean it up
        if (imgSrc.startsWith('/')) imgSrc = imgSrc.substring(1);
        if (imgSrc.startsWith('images/')) imgSrc = imgSrc.substring(7);
        
        const finalSrc = `${baseUrl}images/${imgSrc}`;
        problemHTML += `
          <div class="image-container">
            <img src="${finalSrc}" alt="${item.image.caption || ''}">
            ${item.image.caption ? `<p class="caption">${item.image.caption}</p>` : ''}
          </div>
        `;
      }
      
      const buttonsDiv = document.createElement('div');
      buttonsDiv.className = 'problem-buttons';
      
      const answerDiv = document.createElement('div');
      answerDiv.className = 'problem-answer hidden';
      if (item.answer) {
        answerDiv.innerHTML = `<strong>Хариу:</strong> ${formatText(item.answer)}`;
        const btnAnswer = document.createElement('button');
        btnAnswer.className = 'btn-toggle btn-answer';
        btnAnswer.innerText = 'Хариу харах';
        btnAnswer.onclick = () => {
             answerDiv.classList.toggle('hidden');
             btnAnswer.innerText = answerDiv.classList.contains('hidden') ? 'Хариу харах' : 'Хариу нуух';
        };
        buttonsDiv.appendChild(btnAnswer);
      }

      const solutionDiv = document.createElement('div');
      solutionDiv.className = 'problem-solution hidden';
      if (item.solution) {
        solutionDiv.innerHTML = `<strong>Бодолт:</strong> ${formatText(item.solution)}`;
        const btnSolution = document.createElement('button');
        btnSolution.className = 'btn-toggle btn-solution';
        btnSolution.innerText = 'Бодолт харах';
        btnSolution.onclick = () => {
             solutionDiv.classList.toggle('hidden');
             btnSolution.innerText = solutionDiv.classList.contains('hidden') ? 'Бодолт харах' : 'Бодолт нуух';
             // re-render mathjax if unhidden
             if (!solutionDiv.classList.contains('hidden') && window.MathJax) {
                 window.MathJax.typesetPromise([solutionDiv]);
             }
        };
        buttonsDiv.appendChild(btnSolution);
      }
      
      problemDiv.innerHTML = problemHTML;
      problemDiv.appendChild(buttonsDiv);
      problemDiv.appendChild(answerDiv);
      problemDiv.appendChild(solutionDiv);

      return problemDiv;
    case 'section':
      const sec = document.createElement('section');
      sec.id = item.id;
      sec.innerHTML = `<h2>${item.title}</h2>`;
      item.body.forEach(innerItem => {
        const innerEl = createContentElement(innerItem);
        if (innerEl) sec.appendChild(innerEl);
      });
      return sec;
    case 'subsection':
      const sub = document.createElement('div');
      sub.className = 'subsection';
      sub.innerHTML = `<h3>${item.title}</h3>`;
      item.body.forEach(innerItem => {
        const innerEl = createContentElement(innerItem);
        if (innerEl) sub.appendChild(innerEl);
      });
      return sub;
    case 'equation':
      const eq = document.createElement('div');
      eq.className = 'equation-wrapper';
      const eqLabel = item.tag ? `<span class="equation-tag">(${item.tag})</span>` : '';
      eq.innerHTML = `\\[ ${item.value} \\] ${eqLabel}`;
      return eq;
    case 'image':
      const container = document.createElement('div');
      container.className = 'image-container';
      const baseUrl = import.meta.env.BASE_URL;
      let imgSrc = item.src;
      if (imgSrc.startsWith('/')) imgSrc = imgSrc.substring(1);
      if (imgSrc.startsWith('images/')) imgSrc = imgSrc.substring(7);
      
      const finalSrc = `${baseUrl}images/${imgSrc}`;
      container.innerHTML = `
        <img src="${finalSrc}" alt="${item.caption || ''}">
        ${item.caption ? `<p class="caption">${item.caption}</p>` : ''}
      `;
      return container;
    default:
      return null;
  }
}

function formatText(text) {
  if (!text) return '';
  
  // Support array format for complex statements/solutions in previous books
  if (Array.isArray(text)) {
      return text.map(t => {
          if (t.type === 'text') return formatText(t.value);
          if (t.type === 'equation') {
              const eqLabel = t.tag ? `<span class="equation-tag">(${t.tag})</span>` : '';
              return `<div class="equation-wrapper">\\[ ${t.value} \\] ${eqLabel}</div>`;
          }
          if (t.type === 'image') {
              const baseUrl = import.meta.env.BASE_URL;
              let imgSrc = t.src || t.value;
              if (imgSrc && imgSrc.startsWith('/')) imgSrc = imgSrc.substring(1);
              if (imgSrc && imgSrc.startsWith('images/')) imgSrc = imgSrc.substring(7);
              return `<div class="image-container"><img src="${baseUrl}images/${imgSrc}" alt="${t.caption || ''}">${t.caption ? `<p class="caption">${t.caption}</p>` : ''}</div>`;
          }
          return '';
      }).join('');
  }
  
  if (typeof text !== 'string') return '';

  // Convert $$...$$ to \\[...\\]
  let formatted = text.replace(/\$\$(.+?)\$\$/gs, (match, p1) => `\\[${p1}\\]`);
  // Convert $...$ to \\(...\\)
  return formatted.replace(/\$([^$]+)\$/g, (match, p1) => `\\(${p1.trim()}\\)`);
}

init();
