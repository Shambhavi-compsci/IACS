document.addEventListener('DOMContentLoaded', function() {
    fetch('/profile')
        .then(response => response.json())
        .then(data => {
            document.getElementById('first_name').value = data.first_name || '';
            document.getElementById('middle_name').value = data.middle_name || '';
            document.getElementById('last_name').value = data.last_name || '';
            document.getElementById('date_of_birth').value = data.date_of_birth || '';
            document.getElementById('country_code').value = data.country_code || '';
            document.getElementById('gender').value = data.gender || '';
            document.getElementById('contact_number').value = data.contact_number || '';
            document.getElementById('email').value = data.email || '';
        })
        .catch(error => console.error('Error fetching profile data:', error));

    document.getElementById('profile-form').addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(this);
        fetch('/update-profile', {
            method: 'POST',
            body: new URLSearchParams(formData)
        })
        .then(response => response.text())
        .then(message => {
            alert(message);
            window.location.reload(); // Reload to reflect changes
        })
        .catch(error => console.error('Error updating profile data:', error));
    });

    document.getElementById('cancel-button').addEventListener('click', function() {
        window.location.href = 'profile.html'; // Redirect to profile page
    });
});
