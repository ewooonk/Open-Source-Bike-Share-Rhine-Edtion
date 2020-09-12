var markers=[]; var markerdata=[]; var iconsize=60; var sidebar; var firstrun=1;
var watchID, circle, polyline; var temp="";

$(document).ready(function(){
   $('#overlay').hide();
   $('#standactions').hide();
   $('.bicycleactions').hide();
   $('#notetext').hide();
   $('#couponblock').hide();
   $('#passwordresetblock').hide();
   $("#rent").hide();
   $("#unlock").hide();
 //  if ($('body').data('rented')!=0 || standselected==1) $("#unlock").show();
   $('#test').hide();
    $(document).ajaxStart(function() { $('#overlay').show(); });
  $(document).ajaxStop(function() { $('#overlay').hide(); });
   $("#password").focus(function() { $('#passwordresetblock').show(); });
   $("#resetpassword").click(function() { if (window.ga) ga('send', 'event', 'buttons', 'click', 'password-reset'); resetpassword(); });
   $("#rent").click(function() { if (window.ga) ga('send', 'event', 'buttons', 'click', 'bike-rent'); rent(); });
   $("#unlock").click(function() { if (window.ga) ga('send', 'event', 'buttons', 'click', 'bike-unlock'); unlock1(); });
   $("#return").click(function(e) { if (window.ga) ga('send', 'event', 'buttons', 'click', 'bike-return'); returnbike(); });
   $("#note").click(function() { if (window.ga) ga('send', 'event', 'buttons', 'click', 'bike-note'); note(); });
   $('#stands').change(function() { showstand($('#stands').val()); }).keyup(function() { showstand($('#stands').val()); });
   $("#where").click(function() { if (window.ga) ga('send', 'event', 'buttons', 'click', 'admin-where'); where(); });
   if ($('usercredit'))
      {
      $("#opencredit").click(function() { if (window.ga) ga('send', 'event', 'buttons', 'click', 'credit-enter'); $('#couponblock').toggle(); });
      $("#validatecoupon").click(function() { if (window.ga) ga('send', 'event', 'buttons', 'click', 'credit-add'); validatecoupon(); });
      }
   mapinit();
   setInterval(getmarkers, 60000); // refresh map every 60 seconds
   setInterval(getuserstatus, 60000); // refresh map every 60 seconds
   if ("geolocation" in navigator) {
   navigator.geolocation.getCurrentPosition(showlocation,function(){ return; },{enableHighAccuracy:true,maximumAge:30000});
   watchID=navigator.geolocation.watchPosition(changelocation,function(){ return; },{enableHighAccuracy:true,maximumAge:15000,distanceFilter:1});
   }
  
});

function where()
{
   if (window.ga) ga('send', 'event', 'bikes', 'where', $('#adminparam').val());
   $.ajax({
   url: "command.php?action=where&bikeno=89"
   }).done(function(jsonresponse) {
      jsonobject=$.parseJSON(jsonresponse);
      handleresponse("fleetconsole",jsonobject);
   });
}

function mapinit()
{

   $("body").data("mapcenterlat", maplat);
   $("body").data("mapcenterlong", maplon);
   $("body").data("mapzoom", mapzoom);

   map = new L.Map('map');

   // create the tile layer with correct attribution
   var osmUrl='https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png';
   var osmAttrib='Map data (c) <a href="https://openstreetmap.org">OpenStreetMap</a> contributors';
   var osm = new L.TileLayer(osmUrl, {minZoom: 8, maxZoom: 19, attribution: osmAttrib});

   var today = new Date();
   if (today.getMonth()+'.'+today.getDate()=='3.1') // april fools
      {
      var osm = new L.StamenTileLayer("toner");
      }

   map.setView(new L.LatLng($("body").data("mapcenterlat"), $("body").data("mapcenterlong")), $("body").data("mapzoom"));
   map.addLayer(osm);
   sidebar = L.control.sidebar('sidebar', {
        position: 'left'
        });
   map.addControl(sidebar);
   getmarkers();
   $('link[rel="points"]').each(function() {
      geojsonurl=$(this).attr("href");
      $.getJSON(geojsonurl, function(data) {
         var geojson = L.geoJson(data, {
            onEachFeature: function (feature, layer) { layer.bindPopup(feature.properties.name); },
            pointToLayer: function (feature, latlng) {
               return L.circleMarker(latlng, {
                  radius: 8,
                  fillColor: "#ff7800",
                  color: "#000",
                  weight: 1,
                  opacity: 1,
                  fillOpacity: 0.8
               });
            }
         });
      geojson.addTo(map);
      });
   });
   getuserstatus();
   resetconsole();
   rentedbikes();
   sidebar.show();

}

function getmarkers()
{
   $.ajax({
         global: false,
         url: "command.php?action=map:markers"
         }).done(function(jsonresponse) {
            jsonobject=$.parseJSON(jsonresponse);
            for (var i=0, len=jsonobject.length; i < len; i++)
               {

               if (jsonobject[i].bikecount==0)
                  {
                  tempicon=L.divIcon({
                     iconSize: [iconsize, iconsize],
                     iconAnchor: [iconsize/2, 0],
                     html: '<dl class="icondesc none" id="stand-'+jsonobject[i].standName+'"><dt class="bikecount">'+jsonobject[i].bikecount+'</dt><dd class="standname">'+jsonobject[i].standName+'</dd></dl>',
                     standid: jsonobject[i].standId
                  });
                  }
               else
                  {
                  tempicon=L.divIcon({
                     iconSize: [iconsize, iconsize],
                     iconAnchor: [iconsize/2, 0],
                     html: '<dl class="icondesc" id="stand-'+jsonobject[i].standName+'"><dt class="bikecount">'+jsonobject[i].bikecount+'</dt><dd class="standname">'+jsonobject[i].standName+'</dd></dl>',
                     standid: jsonobject[i].standId
                  });
                  }

               markerdata[jsonobject[i].standId]={name:jsonobject[i].standName,desc:jsonobject[i].standDescription,link:jsonobject[i].standLink,explore:jsonobject[i].standExplore,photo:jsonobject[i].standPhoto,count:jsonobject[i].bikecount};
               markers[jsonobject[i].standId] = L.marker([jsonobject[i].lat, jsonobject[i].lon], { icon: tempicon }).addTo(map).on("click", showstand );
               $('body').data('markerdata',markerdata);
               }
            if (firstrun==1)
               {
               createstandselector();
               firstrun=0;
               }
         });
}

function getuserstatus()
{
   $.ajax({
         global: false,
         url: "command.php?action=map:status"
         }).done(function(jsonresponse) {
            jsonobject=$.parseJSON(jsonresponse);
            $('body').data('limit',jsonobject.limit);
            $('body').data('rented',jsonobject.rented);
            if ($('usercredit')) $('#usercredit').html(jsonobject.usercredit);
            togglebikeactions();
         });
}

function createstandselector()
{
   var selectdata='<option value="del">-- '+_select_stand+' --</option>';
   $.each( markerdata, function( key, value ) {
   if (value!=undefined)
      {
      selectdata=selectdata+'<option value="'+key+'">'+value.name+'</option>';
      }
   });
   $('#stands').html(selectdata);
   var options = $('#stands option');
   var arr = options.map(function(_, o) { return { t: $(o).text(), v: o.value }; }).get();
   arr.sort(function(o1, o2) { return o1.t > o2.t ? 1 : o1.t < o2.t ? -1 : 0; });
   options.each(function(i, o) {
   o.value = arr[i].v;
   $(o).text(arr[i].t);
   });
}

function showstand(e,clear)
{
   standselected=1;
   sidebar.show();
   $('#qrcode').hide();
   $("#rent").hide();
  // $('#bikephoto').hide();
   $('#test').hide();
   rentedbikes();
   checkonebikeattach();
   if ($.isNumeric(e))
      {
      standid=e; // passed via manual call
      lat=markers[e]._latlng.lat;
      long=markers[e]._latlng.lng;
      }
   else
      {
      if (window.ga) ga('send', 'event', 'buttons', 'click', 'stand-select');
      standid=e.target.options.icon.options.standid; // passed via event call
      lat=e.latlng.lat;
      long=e.latlng.lng;
      }
   if (clear!=0)
      {
      resetconsole();
      }
   resetbutton("rent");
   markerdata=$('body').data('markerdata');

   $('#stands').val(standid);
   $('#stands option[value="del"]').remove();
   if (markerdata[standid].count>0)
      {
      $('#standcount').removeClass('label label-danger').addClass('label label-success');
      if (markerdata[standid].count==1)
         {
         $('#standcount').html(markerdata[standid].count+' '+_bicycle+':');
         }
      else
         {
         $('#standcount').html(markerdata[standid].count+' '+_bicycles+':');
         }
      $.ajax({
         global: false,
         url: "command.php?action=list&stand="+markerdata[standid].name
         }).done(function(jsonresponse) {
            jsonobject=$.parseJSON(jsonresponse);
            handleresponse(jsonobject,0);
            bikelist="";
            if (jsonobject.content!="")
               {
               for (var i=0, len=jsonobject.content.length; i < len; i++)
                  {
                  bikeissue=0;
                  bikeshared=0;
                  if (jsonobject.content[i][0]=="*")
                     {
                     bikeissue=1;
                     jsonobject.content[i]=jsonobject.content[i].replace("*","");
                     }
                  if (jsonobject.content[i][0]=="@")
                     {
                     bikeshared=1;
                     jsonobject.content[i]=jsonobject.content[i].replace("@","");
                     }         
                  if (jsonobject.stacktopbike==false) // bike stack is disabled, allow renting any bike
                     {
                     if (bikeissue==1 && $("body").data("limit")>0)
                        {
                        bikelist=bikelist+' <button type="button" class="btn btn-warning bikeid" data-id="'+jsonobject.content[i]+'" data-note="'+jsonobject.notes[i]+'">'+jsonobject.content[i]+'</button>';
                        }
                     else if (bikeissue==1 && $("body").data("limit")==0)
                        {
                        bikelist=bikelist+' <button type="button" class="btn btn-default bikeid" data-id="'+jsonobject.content[i]+'">'+jsonobject.content[i]+'</button>';
                        }
                     else if ($("body").data("limit")>0 && bikeshared==0) bikelist=bikelist+' <button type="button" class="btn btn-success bikeid b'+jsonobject.content[i]+'" data-id="'+jsonobject.content[i]+'">'+jsonobject.content[i]+'</button>';
                     else if ($("body").data("limit")>0 && bikeshared==1) bikelist=bikelist+' <button type="button" class="btn btn-info bikeid b'+jsonobject.content[i]+'" data-id="'+jsonobject.content[i]+'">'+jsonobject.content[i]+'</button>';
                     else bikelist=bikelist+' <button type="button" class="btn btn-default bikeid">'+jsonobject.content[i]+'</button>';
                     }
                  else  // bike stack is enabled, allow renting top of the stack bike only
                     {
                     if (jsonobject.stacktopbike==jsonobject.content[i] && bikeissue==1 && $("body").data("limit")>0)
                        {
                        bikelist=bikelist+' <button type="button" class="btn btn-warning bikeid b'+jsonobject.content[i]+'" data-id="'+jsonobject.content[i]+'" data-note="'+jsonobject.notes[i]+'">'+jsonobject.content[i]+'</button>';
                        }
                     else if (jsonobject.stacktopbike==jsonobject.content[i] && bikeissue==1 && $("body").data("limit")==0)
                        {
                        bikelist=bikelist+' <button type="button" class="btn btn-default bikeid b'+jsonobject.content[i]+'" data-id="'+jsonobject.content[i]+'">'+jsonobject.content[i]+'</button>';
                        }
                     else if (jsonobject.stacktopbike==jsonobject.content[i] && $("body").data("limit")>0) bikelist=bikelist+' <button type="button" class="btn btn-success bikeid b'+jsonobject.content[i]+'" data-id="'+jsonobject.content[i]+'">'+jsonobject.content[i]+'</button>';
                     else bikelist=bikelist+' <button type="button" class="btn btn-default bikeid">'+jsonobject.content[i]+'</button>';
                     }
                  }
               $('#standbikes').html('<div class="btn-group">'+bikelist+'</div>');
               if (jsonobject.stacktopbike!=false) // bike stack is enabled, allow renting top of the stack bike only
                  {
                  $('.b'+jsonobject.stacktopbike).click( function() { if (window.ga) ga('send', 'event', 'buttons', 'click', 'bike-number'); attachbicycleinfo(this,"rent"); });
                  $('body').data('stacktopbike',jsonobject.stacktopbike);
                  }
               else // bike stack is disabled, allow renting any bike
                  {
                  $('#standbikes .bikeid').click( function() { if (window.ga) ga('send', 'event', 'buttons', 'click', 'bike-number'); attachbicycleinfo(this,"rent"); attachbicycleinfoimg(this,"test");  });
                  }
               }
            else // no bicyles at stand
               {
               $('#standcount').html(_no_bicycles);
               $('#standcount').removeClass('label label-success').addClass('label label-danger');
               resetstandbikes();
               }

         });
      }
   else
      {
      $('#standcount').html(_no_bicycles);
      $('#standcount').removeClass('label label-success').addClass('label label-danger');
      resetstandbikes();
      }
   walklink='';
   if ("geolocation" in navigator) // if geolocated, provide link to walking directions
      {
      walklink='<a href="https://www.google.com/maps?q='+$("body").data("mapcenterlat")+','+$("body").data("mapcenterlong")+'+to:'+lat+','+long+'&saddr='+$("body").data("mapcenterlat")+','+$("body").data("mapcenterlong")+'&daddr='+lat+','+long+'&output=classic&dirflg=w&t=m" target="_blank" title="'+_open_map+'">🚶</a>';
      }
    standlink='';   
    if (markerdata[standid].link !== null)
   {
 standlink='<a href="'+markerdata[standid].link+'">ℹ️</a>'+' | ';
   }
       standexplore='';   
    if (markerdata[standid].explore !== null)
   {
 standexplore='<a href="'+markerdata[standid].explore+'">👁️️</a>'+' | ';
 
}
   if (loggedin==1 && markerdata[standid].photo)
      {
      walklink=walklink+' | ';
      // standlink=markerdata[standid].link+' | ';
      $('#standinfo').html(markerdata[standid].desc+' ('+walklink+standlink+standexplore+'<a href="'+markerdata[standid].photo+'" id="photo'+standid+'" title="'+_display_photo+'">📷</a>)');
      $('#standphoto').hide();
      $('#bikephoto').hide();
      $('#standphoto').html('<img src="'+markerdata[standid].photo+'" alt="'+markerdata[standid].name+'" width="100%" />');
      $('#photo'+standid).click(function() { $('#standphoto').slideToggle(); return false; });
      }
   else if (loggedin==1)
      {
      $('#standinfo').html(markerdata[standid].desc);
      if (walklink) $('#standinfo').html(markerdata[standid].desc+' ('+walklink+')');
      $('#standphoto').hide();
      $('#bikephoto').hide();
      }
   else
      {
      $('#standinfo').hide();
      $('#standphoto').hide();
      $('#bikephoto').hide();
      }
   togglestandactions(markerdata[standid].count);
   togglebikeactions();
}

function rentedbikes()
{
   $.ajax({
      global: false,
      url: "command.php?action=userbikes"
      }).done(function(jsonresponse) {
         jsonobject=$.parseJSON(jsonresponse);
         handleresponse(jsonobject,0);
         bikelist="";
         if (jsonobject.content!="")
            {
            for (var i=0, len=jsonobject.content.length; i < len; i++)
               {
               bikelist=bikelist+' <button type="button" class="btn btn-info bikeid b'+jsonobject.content[i]+'" data-id="'+jsonobject.content[i]+'" title="'+_currently_rented+'">'+jsonobject.content[i]+'<br /><span class="label label-primary">('+jsonobject.codes[i]+')</span><br /><span class="label"><s>('+jsonobject.oldcodes[i]+')</s></span></button> ';
               }
            $('#rentedbikes').html('<div class="btn-group">'+bikelist+'</div>');
            if (jsonobject.codes[0]!=0000) $('#unlock').hide();
            if (jsonobject.codes[0]==0000) $('#unlock').show()
            $('#rentedbikes .bikeid').click( function() { attachbicycleinfo(this,"return"); });
            checkonebikeattach();
            }
         else
            {
            resetrentedbikes();
            }
      });
}

function rentedlock()
{
    $.ajax({
      global: false,
      url: "command.php?action=userbikes"
      }).done(function(jsonresponse) {
         jsonobject=$.parseJSON(jsonresponse);
         handleresponse(jsonobject,0);
         code=jsonobject.codes[0];
        console.log(code);
        if (code==0) return true;
      });
   
   
}




function note()
{
   $('#notetext').slideToggle();
   $('#notetext').val('');
}

function togglestandactions(count)
{
   if (loggedin==0)
      {
      $('#standactions').hide();
      $('#qrcode').hide();
      return false;
      }
   if (count==0 || $("body").data("limit")==0)
      {
      $('#standactions').hide();
      
      }
   // if (difkm >0.2)
  //    {
  //    $('#standactions').hide();
  //    return false;
  //    }
      
   else
      {
      $('#standactions').show();
      }
}

function togglebikeactions()
{
//   if (difkm >0.2)
//      {
//      $('.bicycleactions').hide();
//      return false;
//      }
   if (loggedin==0)
      {
      $('.bicycleactions').hide();
      $('#unlock').hide();
      return false;
      }
   if ($('body').data('rented')==0 || standselected==0)
      {
      $('.bicycleactions').hide();     
     
     // $('#unlock').show();
     
     
   if ($('body').data('rented')!=0 && standselected==0)  
      $('.bicycleactions').show();  
      $('#andnote').hide();
      $('#return').hide();
      }
   else
      {
      $('.bicycleactions').show();
      $('#return').show();
      $('#andnote').show();
      $('#note').show();
      }
}

function rent()
{
    latdif = Math.abs($("body").data("mapcenterlat")-lat);
    longdif = Math.abs($("body").data("mapcenterlong")-long);
    latdifkm = latdif*111;
    longdifkm = longdif*111*Math.cos(lat*Math.PI/180);
    difkm = Math.sqrt((latdifkm*latdifkm)+(longdifkm*longdifkm));     
   geofenceid=1
   if (difkm < 0.25) geofenceid=314;
   if ($("body").data("mapcenterlat")==51.9743) geofenceid=561;
   if ($('#rent .bikenumber').html()=="") return false;
   if (window.ga) ga('send', 'event', 'bikes', 'rent', $('#rent .bikenumber').html());
   $.ajax({
   url: "command.php?action=rent&bikeno="+$('#rent .bikenumber').html()+"&geofence="+geofenceid
   }).done(function(jsonresponse) {
      jsonobject=$.parseJSON(jsonresponse);
      handleresponse(jsonobject);
      if (geofenceid==314) resetbutton("rent");
      if (geofenceid==314) $('body').data("limit",$('body').data("limit")-1);
      if ($("body").data("limit")<0) $("body").data("limit",0);
      standid=$('#stands').val();
      markerdata=$('body').data('markerdata');
      standbiketotal=markerdata[standid].count;
      if (jsonobject.error==0)
         {
         $('.b'+$('#rent .bikenumber').html()).remove();
         standbiketotal=(standbiketotal*1)-1;
         markerdata[standid].count=standbiketotal;
         $('body').data('markerdata',markerdata);
         }
      if (standbiketotal==0)
         {
         $('#standcount').removeClass('label-success').addClass('label-danger');
         }
      else
         {
         $('#standcount').removeClass('label-danger').addClass('label-success');
         }
      $('#notetext').val('');
      $('#notetext').hide();
      getmarkers();
      getuserstatus();
      if (geofenceid==314) showstand(standid,0);
   });
}

function unlock()
{
   
   if (window.ga) ga('send', 'event', 'bikes', 'unlock');
   $.ajax({
   url: "command.php?action=unlock"
   }).done(function(jsonresponse) {
      jsonobject=$.parseJSON(jsonresponse);
      handleresponse(jsonobject);
      });
}

function unlock1()
{
   
   if (window.ga) ga('send', 'event', 'bikes', 'unlock');
   $.ajax({
   url: "command.php?action=unlock1&bikeno="+$('#return .bikenumber').html()
   }).done(function(jsonresponse) {
      jsonobject=$.parseJSON(jsonresponse);
      handleresponse(jsonobject);
      });
}

function returnbike()
{
    navigator.geolocation.getCurrentPosition(changelocation,function(){ return; },{enableHighAccuracy:true,maximumAge:1000});
    latdif = Math.abs($("body").data("mapcenterlat")-lat);
    longdif = Math.abs($("body").data("mapcenterlong")-long);
    latdifkm = latdif*111;
    longdifkm = longdif*111*Math.cos(lat*Math.PI/180);
    difkm = Math.sqrt((latdifkm*latdifkm)+(longdifkm*longdifkm)); 
   geofenceid=1;
   if (difkm < 0.25) geofenceid=314;
   if ($("body").data("mapcenterlat")==51.9743) geofenceid=561;
   note="";
   standname=$('#stands option:selected').text();
   standid=$('#stands').val();
   if (window.ga) ga('send', 'event', 'bikes', 'return', $('#return .bikenumber').html());
   if (window.ga) ga('send', 'event', 'stands', 'return', standname);
   if ($('#notetext').val()) note="&note="+$('#notetext').val();
   $.ajax({
   url: "command.php?action=return&bikeno="+$('#return .bikenumber').html()+"&stand="+standname+note+"&geofence="+geofenceid
   }).done(function(jsonresponse) {
      jsonobject=$.parseJSON(jsonresponse);
      handleresponse(jsonobject);
      $('.b'+$('#return .bikenumber').html()).remove();
      resetbutton("return");
      markerdata=$('body').data('markerdata');
      standbiketotal=markerdata[standid].count;
      if (jsonobject.error==0)
         {
         standbiketotal=(standbiketotal*1)+1;
         markerdata[standid].count=standbiketotal
         $('body').data('markerdata',markerdata);
         }
      if (standbiketotal==0)
         {
         $('#standcount').removeClass('label-success');
         $('#standcount').addClass('label-danger');
         }
      $('#notetext').val('');
      $('#notetext').hide();
      getmarkers();
      getuserstatus();
      showstand(standid,0);
   });
}

function validatecoupon()
{
   $.ajax({
   url: "command.php?action=validatecoupon&coupon="+$('#coupon').val()
   }).done(function(jsonresponse) {
      jsonobject=$.parseJSON(jsonresponse);
      temp=$('#couponblock').html();
      if (jsonobject.error==1)
         {
         $('#couponblock').html('<div class="alert alert-danger" role="alert">'+jsonobject.content+'</div>');
         setTimeout(function() { $('#couponblock').html(temp); $("#validatecoupon").click(function() { if (window.ga) ga('send', 'event', 'buttons', 'click', 'credit-add'); validatecoupon(); }); },2500);
         }
      else
         {
         $('#couponblock').html('<div class="alert alert-success" role="alert">'+jsonobject.content+'</div>');
         getuserstatus();
         setTimeout(function() { $('#couponblock').html(temp); $('#couponblock').toggle(); $("#validatecoupon").click(function() { if (window.ga) ga('send', 'event', 'buttons', 'click', 'credit-add'); validatecoupon(); }); },2500);
         }
   });
}

function resetpassword()
{
   $('#passwordresetblock').hide();
   if (sms==0 && $('#number').val()>0)
      {
      $.ajax({
      url: "command.php?action=resetpassword&number="+$('#number').val()
      }).done(function(jsonresponse) {
         jsonobject=$.parseJSON(jsonresponse);
         handleresponse(jsonobject);
         });
      }
   else if (sms==1 && $('#number').val()>0)
      {
      window.location="register.php#reset"+$('#number').val();
      }
}

function attachbicycleinfo(element,attachto)
{
   $('#'+attachto+' .bikenumber').html($(element).attr('data-id'));
   // show warning, if exists:
   if ($(element).hasClass('btn-warning')) $('#console').html('<div class="alert alert-warning" role="alert">'+_reported_problem+' '+$(element).attr('data-note')+'</div>');
   // or hide warning, if bike without issue is clicked
   else if ($(element).hasClass('btn-warning')==false  && $('#console div').hasClass('alert-warning')) resetconsole();
   $('#rent').show();
   $('#test').show();
}

function attachbicycleinfoimg(element,attachto)
{
   $('#'+attachto+' .bikenumber').html('<button class="btn btn-info" type="button" id="photob" ><span class="glyphicon glyphicon-camera"></span> Show bike</button>');
   // show warning, if exists:
   if ($(element).hasClass('btn-warning')) $('#console').html('<div class="alert alert-warning" role="alert">'+_reported_problem+' '+$(element).attr('data-note')+'</div>');
   // or hide warning, if bike without issue is clicked
   else if ($(element).hasClass('btn-warning')==false && $('#console div').hasClass('alert-warning')) resetconsole();
   $('#bikephoto').hide();
   $('#bikephoto').html('<img src="https://www.yoursystemurl.org/img/bikes/'+$(element).attr('data-id')+'.jpg" alt="'+$(element).attr('data-id')+'" width="100%" />');
      $('#photob').click(function() { $('#bikephoto').slideToggle(); return false; });
  }

function checkonebikeattach()
{
   if ($("#rentedbikes .btn-group").length==1)
      {
      element=$("#rentedbikes .btn-group .btn");
      attachbicycleinfo(element,"return");
      }
}

function handleresponse(jsonobject,display)
{
   if (display==undefined)
      {
      if (jsonobject.error==1)
         {
         $('#console').html('<div class="alert alert-danger" role="alert">'+jsonobject.content+'</div>').fadeIn();
         }
      else
         {
         $('#console').html('<div class="alert alert-success" role="alert">'+jsonobject.content+'</div>');
         }
      }
   if (jsonobject.limit)
      {
      if (jsonobject.limit) $("body").data("limit",jsonobject.limit);
      }
}

function resetconsole()
{
   $('#console').html('');
}

function resetbutton(attachto)
{
   $('#'+attachto+' .bikenumber').html('');
}

function resetstandbikes()
{
   $('body').data('stacktopbike',false);
   $('#standbikes').html('');
}

function resetrentedbikes()
{
   $('#rentedbikes').html('');
}

function savegeolocation()
{
  $.ajax({
  url: "command.php?action=map:geolocation&lat="+$("body").data("mapcenterlat")+"&long="+$("body").data("mapcenterlong")
   }).done(function(jsonresponse) {
     return;
   });
}


function showlocation(location)
{
   $("body").data("mapcenterlat", location.coords.latitude);
   $("body").data("mapcenterlong", location.coords.longitude);
   $("body").data("mapzoom", $("body").data("mapzoom")+1);

   // 80 m x 5 mins walking distance
   circle = L.circle([$("body").data("mapcenterlat"), $("body").data("mapcenterlong")],40*5, {
   color: 'green',
   fillColor: '#0f0',
   fillOpacity: 0.1
   }).addTo(map);

   map.setView(new L.LatLng($("body").data("mapcenterlat"), $("body").data("mapcenterlong")), $("body").data("mapzoom"));
   if (window.ga) ga('send', 'event', 'geolocation', 'latlong', $("body").data("mapcenterlat")+","+$("body").data("mapcenterlong"));

}

function changelocation(location)
{
if (Math.abs(location.coords.latitude - $("body").data("mapcenterlat")) > 0.00050 || Math.abs(location.coords.longitude - $("body").data("mapcenterlong")) > 0.00050)
      {
      $("body").data("mapcenterlat", location.coords.latitude);
      $("body").data("mapcenterlong", location.coords.longitude);
      map.removeLayer(circle);
      circle = L.circle([$("body").data("mapcenterlat"), $("body").data("mapcenterlong")],40*5, {
      color: 'green',
      fillColor: '#0f0',
      fillOpacity: 0.1
      }).addTo(map);
      map.setView(new L.LatLng($("body").data("mapcenterlat"), $("body").data("mapcenterlong")), $("body").data("mapzoom"));
      if (window.ga) ga('send', 'event', 'geolocation', 'latlong', $("body").data("mapcenterlat")+","+$("body").data("mapcenterlong"));

      }
}