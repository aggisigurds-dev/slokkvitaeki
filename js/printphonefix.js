/* Print phone fix — wraps Print.showJob to substitute real phone into receipt footer */
(function(){'use strict';
function wrapShowJob(){
  if(!window.Print || !Print.showJob || Print.showJob._phoneFixed) {setTimeout(wrapShowJob,300);return;}
  var orig=Print.showJob;
  var wrapped=function(job){
    orig.call(this,job);
    setTimeout(function(){
      var pb=document.getElementById('print-body');
      if(!pb)return;
      var phone = job && job.phone ? String(job.phone).trim() : '';
      // Update the footer note
      var notes = pb.querySelectorAll('.rcpt-note');
      notes.forEach(function(n){
        if(phone){
          n.innerHTML = n.innerHTML.replace(/\+354\s*XXX\s*XXXX/gi, phone);
          n.innerHTML = n.innerHTML.replace(/XXXXXXXXX/gi, phone);
        } else {
          // No phone on file — remove the callback line entirely
          n.innerHTML = n.innerHTML.replace(/\s*·\s*\+354\s*XXX\s*XXXX/gi,'').replace(/\s*·\s*XXXXXXXXX/gi,'');
        }
      });
      // Also: add Sími line if missing on receipt body
      if(phone){
        var lns=pb.querySelectorAll('.rcpt-ln');
        var hasSimi=false;
        lns.forEach(function(l){if(/Sími/i.test(l.textContent))hasSimi=true;});
        if(!hasSimi && lns.length>0){
          var row=document.createElement('div');
          row.className='rcpt-ln';
          row.innerHTML='<span>Sími</span><span>'+phone+'</span>';
          // Insert after Viðskiptavinur row if possible
          var afterRow=null;
          lns.forEach(function(l){if(/Viðskiptavinur/i.test(l.textContent))afterRow=l;});
          if(afterRow && afterRow.nextSibling) afterRow.parentNode.insertBefore(row, afterRow.nextSibling);
          else lns[0].parentNode.insertBefore(row, lns[0].nextSibling);
        }
      }
    }, 30);
  };
  wrapped._phoneFixed=true;
  Print.showJob=wrapped;
  console.log('[PrintPhoneFix] wrapped Print.showJob');
}
wrapShowJob();
})();