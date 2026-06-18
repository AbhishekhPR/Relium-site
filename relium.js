(function(){
  var root=document.documentElement;
  var storageKey="relium-theme";
  var toggles=document.querySelectorAll("[data-theme-toggle]");

  function setTheme(theme){
    if(theme==="dark"){
      root.setAttribute("data-theme","dark");
    }else{
      root.setAttribute("data-theme","light");
    }
    toggles.forEach(function(toggle){
      var dark=theme==="dark";
      var label=toggle.querySelector("[data-theme-label]");
      toggle.setAttribute("aria-pressed",String(dark));
      toggle.setAttribute("aria-label",dark ? "Switch to light mode" : "Switch to dark mode");
      if(label){label.textContent=dark ? "Dark" : "Light";}
    });
  }

  var storedTheme=null;
  try{storedTheme=window.localStorage.getItem(storageKey);}catch(error){}
  setTheme(storedTheme==='dark' ? 'dark' : 'light');

  toggles.forEach(function(toggle){
    toggle.addEventListener("click",function(){
      var next=root.getAttribute("data-theme")==="dark" ? "light" : "dark";
      setTheme(next);
      try{window.localStorage.setItem(storageKey,next);}catch(error){}
    });
  });

  document.querySelectorAll(".nav-dropdown-wrap").forEach(function(wrap){
    var trigger=wrap.querySelector(".nav-dropdown-trigger");
    var dropdown=wrap.querySelector(".nav-dropdown");
    var closeTimer=null;
    if(!trigger || !dropdown){return;}

    function openDropdown(){
      if(closeTimer){window.clearTimeout(closeTimer);}
      trigger.setAttribute("aria-expanded","true");
      dropdown.classList.add("is-open");
    }

    function closeDropdown(){
      trigger.setAttribute("aria-expanded","false");
      dropdown.classList.remove("is-open");
    }

    function queueClose(){
      if(closeTimer){window.clearTimeout(closeTimer);}
      closeTimer=window.setTimeout(closeDropdown,180);
    }

    trigger.addEventListener("click",function(event){
      event.stopPropagation();
      if(trigger.getAttribute("aria-expanded")==="true"){
        closeDropdown();
      }else{
        openDropdown();
      }
    });
    wrap.addEventListener("mouseenter",openDropdown);
    wrap.addEventListener("mouseleave",queueClose);
    dropdown.addEventListener("mouseenter",openDropdown);
    dropdown.addEventListener("mouseleave",queueClose);
    dropdown.querySelectorAll("a").forEach(function(link){
      link.addEventListener("click",closeDropdown);
    });
    document.addEventListener("click",function(event){
      if(!wrap.contains(event.target)){closeDropdown();}
    });
  });

  var buttons=document.querySelectorAll(".mobile-menu-toggle");
  buttons.forEach(function(button){
    var menu=document.getElementById(button.getAttribute("aria-controls"));
    if(!menu){return;}
    button.addEventListener("click",function(){
      var expanded=button.getAttribute("aria-expanded")==="true";
      button.setAttribute("aria-expanded",String(!expanded));
      menu.classList.toggle("is-open",!expanded);
    });
    menu.querySelectorAll("a,button").forEach(function(link){
      link.addEventListener("click",function(){
        button.setAttribute("aria-expanded","false");
        menu.classList.remove("is-open");
      });
    });
  });

  var mobileQuery=window.matchMedia("(max-width: 768px)");
  function updateDemoLinks(){
    document.querySelectorAll("[data-demo-link]").forEach(function(link){
      if(mobileQuery.matches){
        link.setAttribute("href",link.getAttribute("data-mailto-href"));
        link.removeAttribute("target");
        link.removeAttribute("rel");
      }else{
        link.setAttribute("href",link.getAttribute("data-gmail-href"));
        link.setAttribute("target","_blank");
        link.setAttribute("rel","noopener");
      }
    });
  }
  updateDemoLinks();
  if(mobileQuery.addEventListener){
    mobileQuery.addEventListener("change",updateDemoLinks);
  }else if(mobileQuery.addListener){
    mobileQuery.addListener(updateDemoLinks);
  }

  var revealItems=document.querySelectorAll(".reveal");
  if("IntersectionObserver" in window){
    var observer=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add("reveal-visible");
          observer.unobserve(entry.target);
        }
      });
    },{threshold:.14,rootMargin:"0px 0px -40px 0px"});
    revealItems.forEach(function(item){observer.observe(item);});
  }else{
    revealItems.forEach(function(item){item.classList.add("reveal-visible");});
  }

  var pipelineGraph=document.querySelector(".data-pipeline-graph");
  var pipelineSection=document.querySelector("#pipeline");
  var reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)");

  function beginSvgAnimation(animation, delay){
    window.setTimeout(function(){
      if(animation && typeof animation.beginElement==="function"){
        animation.beginElement();
      }
    },delay);
  }

  function initPipelineReviewMap(){
    if(!pipelineGraph){return;}
    var nodes=pipelineGraph.querySelectorAll("[data-pipeline-step]");
    var inspector=pipelineGraph.querySelector(".pipeline-inspector");
    if(!nodes.length || !inspector){return;}

    var kicker=inspector.querySelector("[data-inspector-kicker]");
    var title=inspector.querySelector("[data-inspector-title]");
    var body=inspector.querySelector("[data-inspector-body]");
    var metric=inspector.querySelector("[data-inspector-metric]");
    var owner=inspector.querySelector("[data-inspector-owner]");

    function selectNode(node){
      nodes.forEach(function(item){
        var selected=item===node;
        item.classList.toggle("is-selected",selected);
        item.setAttribute("aria-pressed",String(selected));
      });
      if(kicker){kicker.textContent=node.getAttribute("data-kicker") || "";}
      if(title){title.textContent=node.getAttribute("data-title") || "";}
      if(body){body.textContent=node.getAttribute("data-body") || "";}
      if(metric){metric.textContent=node.getAttribute("data-metric") || "";}
      if(owner){owner.textContent=node.getAttribute("data-owner") || "";}
      inspector.classList.remove("is-updating");
      window.requestAnimationFrame(function(){inspector.classList.add("is-updating");});
    }

    nodes.forEach(function(node){
      node.addEventListener("mouseenter",function(){selectNode(node);});
      node.addEventListener("focus",function(){selectNode(node);});
      node.addEventListener("click",function(){selectNode(node);});
    });
  }

  function activatePipeline(){
    if(!pipelineGraph || pipelineGraph.dataset.pipelineActivated==="true"){return;}
    pipelineGraph.dataset.pipelineActivated="true";
    pipelineGraph.classList.add("pipeline-visible");

    if(reducedMotion.matches){
      pipelineGraph.classList.add("pipeline-reduced");
      return;
    }

    window.setTimeout(function(){
      pipelineGraph.classList.add("pipeline-flowing");
      pipelineGraph.querySelectorAll(".pipeline-motion").forEach(function(animation){
        var delay=parseFloat(animation.getAttribute("data-delay") || "0") * 1000;
        beginSvgAnimation(animation,delay);
      });

      var transformationStage=pipelineGraph.querySelector(".transformation-layer");
      function showRiskCaught(){
        if(transformationStage){
          transformationStage.classList.add("risk-caught");
          window.setTimeout(function(){transformationStage.classList.remove("risk-caught");},1250);
        }
      }
      window.setTimeout(showRiskCaught,1500);
      window.setInterval(showRiskCaught,4000);
    },700);
  }

  if(pipelineGraph){
    initPipelineReviewMap();
    pipelineGraph.classList.add("pipeline-primed");
    if(reducedMotion.matches){
      activatePipeline();
    }else if("IntersectionObserver" in window){
      var pipelineObserver=new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            activatePipeline();
            pipelineObserver.unobserve(entry.target);
          }
        });
      },{threshold:.22});
      pipelineObserver.observe(pipelineSection || pipelineGraph);
    }else{
      activatePipeline();
    }
  }

  var rcaModal=document.getElementById("demo-rca-modal");
  var rcaPanel=document.getElementById("demo-rca");
  var lastRcaTrigger=null;

  function openRcaModal(trigger){
    if(!rcaModal || !rcaPanel){return;}
    lastRcaTrigger=trigger || null;
    rcaModal.hidden=false;
    document.body.classList.add("modal-open");
    rcaPanel.classList.remove("is-highlighted");
    window.requestAnimationFrame(function(){
      rcaPanel.classList.add("is-highlighted");
      rcaPanel.focus({preventScroll:true});
    });
  }

  function closeRcaModal(){
    if(!rcaModal){return;}
    rcaModal.hidden=true;
    document.body.classList.remove("modal-open");
    if(lastRcaTrigger){lastRcaTrigger.focus();}
  }

  document.querySelectorAll("[data-open-rca]").forEach(function(button){
    button.addEventListener("click",function(){
      openRcaModal(button);
    });
  });
  document.querySelectorAll("[data-close-rca]").forEach(function(button){
    button.addEventListener("click",closeRcaModal);
  });
  document.addEventListener("keydown",function(event){
    if(event.key==="Escape" && rcaModal && !rcaModal.hidden){
      closeRcaModal();
    }
  });
})();
