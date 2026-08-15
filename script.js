// Укажите URL к вашему .docx файлу (если он лежит на сервере)
const DOCX_URL = 'recipes.docx'; // например, 'https://example.com/recipes.docx'

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('recipes-container');
    const fileInput = document.getElementById('docxFile');

    if (!container) return;

    // Функция отображения ошибок
    function showError(message) {
        container.innerHTML = `<p style="color:red;">${message}</p>`;
    }

    // Функция конвертации docx в HTML и вставки в контейнер
    async function loadAndRenderDocx(arrayBuffer) {
        try {
            const result = await mammoth.convertToHtml(
                { arrayBuffer: arrayBuffer },
                {
                    convertImage: mammoth.images.imgElement(async (image) => {
                        const imageBuffer = await image.read();
                        const base64 = arrayBufferToBase64(imageBuffer);
                        const contentType = image.contentType || 'image/png';
                        return { src: `data:${contentType};base64,${base64}` };
                    })
                }
            );
            const recipesHTML = wrapRecipes(result.value);
            container.innerHTML = recipesHTML;

            // Добавляем обработчики для аккордеона
            document.querySelectorAll('.recipe-header').forEach(header => {
                header.addEventListener('click', () => {
                    header.parentElement.classList.toggle('active');
                });
            });
        } catch (error) {
            showError(`Не удалось прочитать документ: ${error.message}`);
        }
    }

    /**
     * Разделяет HTML по заголовкам <h1> и оборачивает каждый блок в <div class="recipe">
     * Если заголовков <h1> нет, пробует <h2>.
     */
function wrapRecipes(htmlString) {
    // Разделяем по заголовкам h1 или h2
    let parts = htmlString.split(/(?=<h1\b)/i);
    let selector = 'h1';

    if (parts.length <= 1) {
        parts = htmlString.split(/(?=<h2\b)/i);
        selector = 'h2';
    }

    if (parts.length <= 1) {
        return htmlString; // если заголовков нет, возвращаем как есть
    }

    return parts.map(part => {
        if (part.trim() === '') return '';

        // Найти первый тег заголовка в начале
        const headerRegex = new RegExp('^<'+selector+'\\b[^>]*>(.*?)</'+selector+'>', 'i');
        const match = part.match(headerRegex);
        if (!match) return part;

        const headerHTML = match[0];
        let contentHTML = part.slice(match[0].length);

        // Ищем первый абзац <p>...</p> в contentHTML
        const pRegex = /<p\b[^>]*>.*?<\/p>/i;
        const pMatch = contentHTML.match(pRegex);
        let summaryHTML = '';
        if (pMatch) {
            summaryHTML = pMatch[0];
            // Удаляем найденный абзац из контента
            contentHTML = contentHTML.replace(pMatch[0], '');
        }

        return `
            <div class="recipe">
                <div class="recipe-header">
                    ${headerHTML}
                    ${summaryHTML ? `<div class="recipe-summary">${summaryHTML}</div>` : ''}
                </div>
                <div class="recipe-content">${contentHTML}</div>
            </div>
        `;
    }).join('');
}

    // Загрузка с указанного URL при старте
    if (DOCX_URL) {
        fetch(DOCX_URL)
            .then(response => {
                if (!response.ok) throw new Error(`Ошибка загрузки файла: ${response.status}`);
                return response.arrayBuffer();
            })
            .then(arrayBuffer => loadAndRenderDocx(arrayBuffer))
            .catch(error => showError(`Не удалось загрузить рецепты. ${error.message}`));
    }

    // Обработка выбора файла пользователем (если input добавлен)
    if (fileInput) {
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const arrayBuffer = e.target.result;
                loadAndRenderDocx(arrayBuffer);
            };
            reader.readAsArrayBuffer(file);
        });
    }
});

// Вспомогательная функция для перевода ArrayBuffer в base64
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
}

