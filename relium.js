(function(){
  if(window.location && window.history && window.history.replaceState){
    var cleanPath=window.location.pathname.replace(/\/index\.html$/,"/").replace(/\.html$/,"");
    if(cleanPath!==window.location.pathname){
      window.history.replaceState(null,"",cleanPath + window.location.search + window.location.hash);
    }
  }

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

  var blogArticles=document.querySelectorAll("[data-blog-article]");
  var blogTags=document.querySelectorAll("[data-blog-filter]");
  var blogEmpty=document.querySelector("[data-blog-empty]");
  var blogReader=document.getElementById("article-reader");
  var blogReaderPanel=blogReader ? blogReader.querySelector(".blog-reader-panel") : null;
  var blogReaderTitle=blogReader ? blogReader.querySelector("[data-reader-title]") : null;
  var blogReaderMeta=blogReader ? blogReader.querySelector("[data-reader-meta]") : null;
  var blogReaderBody=blogReader ? blogReader.querySelector("[data-reader-body]") : null;
  var lastBlogTrigger=null;

  function blogCategoryLabel(value){
    return (value || "").replace(/\b\w/g,function(letter){return letter.toUpperCase();});
  }

  function buildArticleBody(article){
    var title=article.getAttribute("data-blog-title") || "Relium article";
    var category=blogCategoryLabel(article.getAttribute("data-blog-category"));
    var excerpt=article.getAttribute("data-blog-excerpt") || "";
    return [
      excerpt,
      "The practical lesson: treat this as a production reliability risk, not just a code style preference. The safest review asks what business metric changes, which downstream assets inherit the change, and who needs to approve it before merge.",
      "Relium's approach is to connect SQL review, dbt lineage, and incident context before the model reaches production. That gives teams a readable risk summary while the fix is still cheap."
    ].map(function(text,index){
      var paragraph=document.createElement("p");
      paragraph.textContent=index===1 && category ? text.replace("this",category.toLowerCase()) : text;
      if(index===0 && title){paragraph.setAttribute("data-article-intro","true");}
      return paragraph;
    });
  }

  function openBlogReader(article,trigger){
    if(!blogReader || !blogReaderPanel || !blogReaderTitle || !blogReaderMeta || !blogReaderBody){return;}
    lastBlogTrigger=trigger || article;
    var category=blogCategoryLabel(article.getAttribute("data-blog-category"));
    var title=article.getAttribute("data-blog-title") || "";
    var meta=article.getAttribute("data-blog-meta") || "";
    blogReaderTitle.textContent=title;
    blogReaderMeta.textContent=category + (meta ? " · " + meta : "");
    blogReaderBody.replaceChildren();
    buildArticleBody(article).forEach(function(paragraph){blogReaderBody.appendChild(paragraph);});
    blogReader.hidden=false;
    document.body.classList.add("modal-open");
    window.requestAnimationFrame(function(){blogReaderPanel.focus({preventScroll:true});});
  }

  function closeBlogReader(){
    if(!blogReader){return;}
    blogReader.hidden=true;
    document.body.classList.remove("modal-open");
    if(lastBlogTrigger){lastBlogTrigger.focus();}
  }

  blogArticles.forEach(function(article){
    var triggers=article.matches("a") ? [article] : Array.prototype.slice.call(article.querySelectorAll("[data-read-article]"));
    triggers.forEach(function(trigger){
      trigger.addEventListener("click",function(event){
        event.preventDefault();
        openBlogReader(article,trigger);
      });
    });
  });

  document.querySelectorAll("[data-close-blog-reader]").forEach(function(button){
    button.addEventListener("click",closeBlogReader);
  });

  document.addEventListener("keydown",function(event){
    if(event.key==="Escape" && blogReader && !blogReader.hidden){
      closeBlogReader();
    }
  });

  function applyBlogFilter(filter){
    var visibleCount=0;
    blogArticles.forEach(function(article){
      var category=(article.getAttribute("data-blog-category") || "").toLowerCase();
      var visible=filter==="all" || category===filter;
      article.classList.toggle("is-hidden",!visible);
      if(visible){visibleCount += 1;}
    });
    if(blogEmpty){blogEmpty.classList.toggle("is-visible",visibleCount===0);}
  }

  blogTags.forEach(function(tag){
    tag.addEventListener("click",function(){
      var filter=(tag.getAttribute("data-blog-filter") || "all").toLowerCase();
      blogTags.forEach(function(item){
        var selected=item===tag;
        item.classList.toggle("active",selected);
        item.setAttribute("aria-pressed",String(selected));
      });
      applyBlogFilter(filter);
    });
  });

  var newsletterForm=document.querySelector("[data-newsletter-form]");
  if(newsletterForm){
    var newsletterInput=newsletterForm.querySelector("input[type='email']");
    var newsletterStatus=document.querySelector("[data-newsletter-status]");
    newsletterForm.addEventListener("submit",function(event){
      event.preventDefault();
      var email=newsletterInput ? newsletterInput.value.trim() : "";
      var valid=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if(newsletterStatus){newsletterStatus.classList.toggle("is-error",!valid);}
      if(!valid){
        if(newsletterStatus){newsletterStatus.textContent="Enter a valid email to subscribe.";}
        if(newsletterInput){newsletterInput.focus();}
        return;
      }
      if(newsletterStatus){newsletterStatus.textContent="You're subscribed. We'll send the next Relium post there.";}
      newsletterForm.reset();
    });
  }
})();
