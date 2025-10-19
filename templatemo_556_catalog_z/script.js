/* Highway Template JS - custom.js */

(function($) {
    "use strict";

    $(document).ready(function() {
        // --- 1. Hamburger Menu Toggle ---
        
        var menuIcon = $('.menu-icon');
        var overlayMenu = $('.overlay-menu');

        menuIcon.on('click', function() {
            // Toggle the 'active' class on the icon (for the 'X' animation)
            $(this).toggleClass('active');
            
            // Toggle the 'open' class on the overlay menu (for slide-in animation)
            overlayMenu.toggleClass('open');
            
            // Disable body scroll when menu is open
            $('body').toggleClass('menu-open');
        });

        // --- 2. Contact Modal (Popup) Functionality ---

        var modal = $('#modal');
        var modalContent = $('.modal-content');
        var modalTrigger = $('.modal-btn'); // Used for both navbar link and floating icon
        var closeButton = $('#close_btn');

        // Function to open the modal
        modalTrigger.on('click', function(e) {
            e.preventDefault();
            
            // Make modal visible and apply "in" animation
            modal.css('display', 'block');
            modalContent.removeClass('modal-animated-out').addClass('modal-animated-in');
            
            // Add no-scroll class to body
            $('body').addClass('modal-open');
        });

        // Function to close the modal
        closeButton.on('click', function() {
            // Apply "out" animation
            modalContent.removeClass('modal-animated-in').addClass('modal-animated-out');

            // Wait for animation to complete before hiding the modal (600ms defined in CSS)
            setTimeout(function() {
                modal.css('display', 'none');
                $('body').removeClass('modal-open');
            }, 600);
        });

        // Close when clicking outside the modal content
        $(window).on('click', function(event) {
            if ($(event.target).is(modal)) {
                modalContent.removeClass('modal-animated-in').addClass('modal-animated-out');
                setTimeout(function() {
                    modal.css('display', 'none');
                    $('body').removeClass('modal-open');
                }, 600);
            }
        });

    });

})(jQuery);
