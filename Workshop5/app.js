const form = document.getElementById('signupForm');
const fields = {
    name: document.getElementById('name'),
    email: document.getElementById('email'),
    password: document.getElementById('password'),
    phone: document.getElementById('phone'),
    companyToggle: document.getElementById('companyToggle'),
    company: document.getElementById('company'),
    hp: document.getElementById('hp')
};
const errorEls = {
    name: document.getElementById('nameError'),
    email: document.getElementById('emailError'),
    password: document.getElementById('passwordError'),
    phone: document.getElementById('phoneError'),
    company: document.getElementById('companyError')
};
const companySection = document.getElementById('companyFields');
const summary = document.getElementById('error-summary');
const clearBtn = document.getElementById('clearBtn');
// Toggle company fields
fields.companyToggle.addEventListener('change', () => {
    companySection.hidden = !fields.companyToggle.checked;
    if (!companySection.hidden) fields.company.setAttribute('required', '');
    else {
        fields.company.removeAttribute('required');
        errorEls.company.textContent = '';
    }
});
// Debounce utility to limit validation frequency
function debounce(fn, wait = 250) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), wait);
    };
}
// Field validation rules
function validateName() {
    const el = fields.name;
    el.setCustomValidity('');
    if (el.validity.valueMissing) el.setCustomValidity('Name is required.');
    else if (el.value.trim().length < 2) el.setCustomValidity('Name must be at least 2 characters.');
    errorEls.name.textContent = el.validationMessage;
    el.setAttribute('aria-invalid', String(!el.checkValidity()));
    return el.checkValidity();
}
function validateEmail() {
    const el = fields.email;
    el.setCustomValidity('');
    if (el.validity.valueMissing) el.setCustomValidity('Email is required.');
    else if (el.validity.typeMismatch) el.setCustomValidity('Enter a valid email address.');
    errorEls.email.textContent = el.validationMessage;
    el.setAttribute('aria-invalid', String(!el.checkValidity()));
    return el.checkValidity();
}
function validatePassword() {
    const el = fields.password;
    el.setCustomValidity('');
    if (el.validity.valueMissing) el.setCustomValidity('Password is required.');
    else if (el.validity.tooShort) el.setCustomValidity('Password must be at least 8 characters.');
    else if (!/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)/.test(el.value)) el.setCustomValidity('Add upper, lower, and a number.');
    errorEls.password.textContent = el.validationMessage;
    el.setAttribute('aria-invalid', String(!el.checkValidity()));
    return el.checkValidity();
}
function validatePhone() {
    const el = fields.phone;
    el.setCustomValidity('');
    if (el.value && !el.checkValidity()) el.setCustomValidity('Phone format example: +358 40 123 4567');
    errorEls.phone.textContent = el.validationMessage;
    el.setAttribute('aria-invalid', String(!el.checkValidity()));
    return el.checkValidity();
}
function validateCompany() {
    if (companySection.hidden) return true;
    const el = fields.company;
    el.setCustomValidity('');
    if (el.validity.valueMissing) el.setCustomValidity('Company name is required when registering as a company.');
    errorEls.company.textContent = el.validationMessage;
    el.setAttribute('aria-invalid', String(!el.checkValidity()));
    return el.checkValidity();
}
// Live validation with debounce and summary update
fields.name.addEventListener('input', () => { debounce(validateName, 150)(); buildSummary(); });
fields.email.addEventListener('input', () => { debounce(validateEmail, 150)(); buildSummary(); });
fields.password.addEventListener('input', () => { debounce(validatePassword, 150)(); buildSummary(); });
fields.phone.addEventListener('input', () => { debounce(validatePhone, 150)(); buildSummary(); });
fields.company.addEventListener('input', () => { debounce(validateCompany, 150)(); buildSummary(); });
// Error summary builder
function buildSummary() {
    const problems = [];
    if (!validateName()) problems.push('Name: ' + fields.name.validationMessage);
    if (!validateEmail()) problems.push('Email: ' + fields.email.validationMessage);
    if (!validatePassword()) problems.push('Password: ' + fields.password.validationMessage);
    if (!validatePhone()) problems.push('Phone: ' + fields.phone.validationMessage);
    if (!companySection.hidden && !validateCompany()) problems.push('Company: ' + fields.company.validationMessage);
    if (problems.length) {
        summary.classList.remove('visually-hidden');
        summary.innerHTML = 'Please fix the following: ' + problems.join('');
    } else {
        summary.classList.add('visually-hidden');
        summary.innerHTML = '';
    }
}
// Autosave and store data
const STORAGE_KEY = 'ws5-signup';
function saveDraft() {
    const data = {
        name: fields.name.value,
        email: fields.email.value,
        phone: fields.phone.value,
        password: fields.password.value,
        companyToggle: fields.companyToggle.checked,
        company: fields.company.value
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log('Saved Draft:', data);
}
function restoreDraft() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        fields.name.value = data.name || '';
        fields.email.value = data.email || '';
        fields.phone.value = data.phone || '';
        fields.password.value = data.password || '';
        fields.companyToggle.checked = Boolean(data.companyToggle);
        companySection.hidden = !fields.companyToggle.checked;
        fields.company.value = data.company || '';
        console.log('Restored Draft:', data);
    } catch (e) {
        console.error('Restore Error:', e);
    }
}
['input', 'change'].forEach(evt => form.addEventListener(evt, debounce(saveDraft, 300)));
restoreDraft();
// Clear form
clearBtn.addEventListener('click', () => {
    form.reset();
    localStorage.removeItem(STORAGE_KEY);
    Object.values(errorEls).forEach(e => e.textContent = '');
    companySection.hidden = true;
    buildSummary();
    console.log('Form Cleared');
});
// Submit with client-side checks and safe demo POST
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const isValid = validateName() && validateEmail() && validatePassword() && validatePhone() && validateCompany();
    buildSummary();
    const firstInvalid = form.querySelector('[aria-invalid="true"]');
    if (!isValid && firstInvalid) {
        firstInvalid.focus();
        return;
    }
    if (fields.hp.value) {
        alert('Submission blocked due to bot detection.');
        return;
    }
    const payload = {
        name: fields.name.value,
        email: fields.email.value,
        phone: fields.phone.value,
        company: fields.companyToggle.checked ? fields.company.value : '',
        time: new Date().toISOString()
    };
    try {
        const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        alert('Submitted successfully. Demo ID: ' + data.id);
        console.log('Submitted Data:', payload);
    } catch (error) {
        alert('Network error occurred. Please try again.');
        console.error('Submission Error:', error);
    }
});

fields.phone.addEventListener('blur', () => {
    const digits = fields.phone.value.replace(/[^0-9+]/g, '');
    if (digits.startsWith('0')) {
        fields.phone.value = '+358' + digits.slice(1);
    } else if (digits.startsWith('+')) {
        fields.phone.value = digits;
    } else {
        fields.phone.value = '+358' + digits;
    }
    console.log('Normalized Phone:', fields.phone.value); // Debug output
});