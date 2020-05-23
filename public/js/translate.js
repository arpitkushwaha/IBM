// WORK IN PROGRESS BELOW

$('document').ready(function () {


    // RESTYLE THE DROPDOWN MENU
    $('#google_translate_element').on("click", function () {

        //     // Change font family and color
        //     $("iframe").contents().find(".goog-te-menu2-item div, .goog-te-menu2-item:link div, .goog-te-menu2-item:visited div, .goog-te-menu2-item:active div, .goog-te-menu2 *")
        //         .css({
        //             'color': '#544F4B',
        //             'font-family': 'Roboto',
        //             'width': '100%',
        //             'font-size': '16px'
        //         });
        //     // Change menu's padding
        //     $("iframe").contents().find('.goog-te-menu2-item-selected').css('display', 'none');

        //     // Change menu's padding
        //     $("iframe").contents().find('.goog-te-menu2').css({ 'padding': '0px', 'text-align': 'center' });

        //     // Change the padding of the languages
        //     $("iframe").contents().find('.goog-te-menu2-item div').css('padding', '10px');

        //     // Change the width of the languages
        //     $("iframe").contents().find('.goog-te-menu2-item').css('width', '100%');
        //     $("iframe").contents().find('td').css('width', '100%');

        //     // Change hover effects
        //     $("iframe").contents().find(".goog-te-menu2-item div").hover(function () {
        //         $(this).css('background-color', '#4385F5').find('span.text').css('color', 'white');
        //     }, function () {
        //         $(this).css('background-color', 'white').find('span.text').css('color', '#544F4B');
        //     });

        //     // Change Google's default blue border
        //     $("iframe").contents().find('.goog-te-menu2').css('border', 'none');

        //     // Change the iframe's box shadow
        //     $(".goog-te-menu-frame").css('box-shadow', '0 16px 24px 2px rgba(0, 0, 0, 0.14), 0 6px 30px 5px rgba(0, 0, 0, 0.12), 0 8px 10px -5px rgba(0, 0, 0, 0.3)');

        //     if ($(window).width() < 500) {
        //         $(".goog-te-menu-frame").css({
        //             'height': '120vh',
        //             'width': '50vw',
        //             'top': '0px',
        //             'postion': 'absolute',
        //             'left': '50vw'
        //         });
        //     }
        //     else {
        //         $(".goog-te-menu-frame").css({
        //             'height': '120vh',
        //             'width': '50vw',
        //             'max-width': '250px',
        //             'top': '0px',
        //             'postion': 'absolute',
        //             'left': 'calc(100% - 250px)'
        //         });
        //     }

        // Change iframes's size
        $("iframe").contents().find('.goog-te-menu2').css({
            'height': '320px',
            // 'width': '100%'
        });

        $(".goog-te-menu-frame").css({
            'height': '320px',
        });

        $("iframe").contents().find('tr').css({
            'display': 'flex',
            'flex-direction': 'column'
        });

        $("iframe").contents().find('tr td:nth-child(2)').css({
            'display': 'none',
        });
    });
});
