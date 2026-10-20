/* Apparence : « système » par défaut ; clair ou sombre si l’utilisateur l’a choisi. Appliqué avant le premier affichage. */
(function(){var t=null;try{t=localStorage.getItem('hygo-theme')}catch(e){}
if(t==='dark'||t==='light')document.documentElement.dataset.theme=t;})();
