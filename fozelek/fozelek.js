var fozelek=new function() {
    
//{{{ Konstansok
    var DEBUG = true;
    var CRLF = '<br/>';
    var SZERETED = 'Feltétlen főtt étel!';
    var SZERETI = 'Szereti a főzeléket!';
    var NEM_SZERETED ='Nem szeretem a főzeléket!';
    var NEM_SZERETI = 'Nem szereti a főzeléket!';
//}}}

//{{{ Számlálók
    var ennyibol = 0;
    var ennyien = 0;
//}}}

//{{{ Küldő rész

    // Activity küldés
    var logActivity = function( txt ) {
        //történés rögzítése
        var params = {};
        params[opensocial.Activity.Field.TITLE] = txt;
        var activity = opensocial.newActivity(params);
        opensocial.requestCreateActivity(activity,opensocial.CreateActivityPriority.HIGH);
        log('logActivity',txt);
    }

    // Beupdateljük az igazságot, 
    // ez majd segít eldönteni a finomfőzelékről...
    var lockDown = function(event,text) {
      Event.stop(event);
      show( text );
      logActivity( text );
    }

    // Ez az adat a felposztoláshoz kell
    var adat = false;

    var sendData = function( varname, data ) {
        var req = opensocial.newDataRequest();
        adat = {szereti:data};
        req.add(req.newUpdatePersonAppDataRequest("VIEWER", varname, adat));
        req.send();
        info('sendData');
        log('Varname', varname);
        log('Data',adat['szereti']);            
    }

    var igen = function(event) {
        log('Gombnyomás','igen');
        sendData( 'fozelek', 'igen' );
        lockDown(event, SZERETED);
    }

    var nem = function(event) {
        log('Gombnyomás','nem');
        sendData( 'fozelek', 'nem' );
        lockDown(event, NEM_SZERETED);
    }
//}}}

    var extractFozelekData = function(data, person) {
        if(person != null && data[person.getId()]) {
            log('ExtractedPerson',person.getId());
            log('ExtractedData',data[person.getId()]['fozelek']);
            var fozi = gadgets.json.parse(gadgets.util.unescapeString(data[person.getId()]['fozelek']));
            log('fozi',fozi);
            if( fozi['szereti'] == "igen" ){
                return true;
            }
        }

        return false;
    }

//{{{ Adatok kiiratása

    var show = function(text) {
        info('show',text);
        $('az_igazsag').update( text );
    }

    
    var idegen_oldal = function (viewer) {
        return !viewer.isOwner();
    }

    var valasz = function(idegen,igazsag) {
        if(igazsag){
            show(idegen ? SZERETI : SZERETED);
        }
        else {
            show(idegen ? NEM_SZERETI : NEM_SZERETED);
        }
    }

    var show_stat = function() {
        log( 'Ennyiből', ennyibol);
        log( 'Ennyien', ennyien);
        var st = $('statisztika');
        if(ennyien == 0){
            st.update( 'Ismerőseid közűl még senki sem szereti a főzeléket! Milyen dolog ez?' );
        }
        else {
            if( ennyibol == 0 ) return;
            if( ennyibol == ennyien ){
                st.update( 'A főzeléket minden ismerősöd szereti!');
                return;
            }
            st.update( 'Ismerőseid ' + ((ennyien / ennyibol) * 100).toString() + '%-a szereti a főzeléket!');
        }
    }
//}}}
//{{{ Callback függvények
    // Itt az ismerősök adatait dolgozzuk fel
    var load_stat = function(data) {
        info('Megjött a válasz a statisztika lekérdezésre');
        // lekérdeztük a tulajdonos barátait..
        var friends = data.get('ownerFriends').getData();
        // ..és az ő adataikat
        var friendsData = data.get('ownerFriendsData').getData();

        ennyibol = friends.size();
        
        friends.each(function(person) {
            if(extractFozelekData(friendsData,person)) ennyien += 1;
        });
        // Statisztika kiszámítás és kijelzés
        show_stat();
    }
    // Itt a saját adatainkat
    var load = function(data) {
        info('Megjött a válasz!');
        var viewer = data.get('viewer').getData();
        var owner = data.get('owner').getData();

        log('viewer', viewer.getId());
        var szereted = extractFozelekData(data.get('viewerData').getData(),viewer);

        var szereti = szereted;
        if(idegen_oldal(viewer)){
            szereti = extractFozelekData(data.get('ownerData').getData(),owner);

            log('owner', owner.getId());
            log('data', szereti );
        }
        
        //itt jön a logika, => ha nem a sajátomat nézem, akkor
        if(idegen_oldal(viewer)) {
            valasz(true,szereti);
            hide('choice');
        }
        else {
            //a sa
            valasz(false,szereted);
        }

        start_stat();
    }
//}}}
    var start_stat = function() {
        ennyibol = 1;
        ennyien = 0;
        requestData( 'stat', load_stat );
        setTimeout( start_stat, 60000 );
    }

    var hide = function(mit){
        switch(mit){
            case 'choice':
                //$('kutatas').update('');
                $('kutatas').style="display:none";
                break;
        }
    }


//{{{ Lekérdezések

    /* a method-dal lehet megadni, hogy melyik lekérést hajtsuk végre */
    var requestData = function( method, callbackfunction ){
        var viewer = opensocial.newIdSpec({ "userId" : "VIEWER" });
        var owner = opensocial.newIdSpec({ "userId" : "OWNER" });
        var req = opensocial.newDataRequest();

        req.add(req.newFetchPersonRequest(opensocial.IdSpec.PersonId.VIEWER), 'viewer');
        req.add(req.newFetchPersonRequest(opensocial.IdSpec.PersonId.OWNER), 'owner');
        

        switch(method) {
            case 'init' :
                req.add(req.newFetchPersonAppDataRequest(viewer, 'fozelek'), 'viewerData');
                req.add(req.newFetchPersonAppDataRequest(owner, 'fozelek'), 'ownerData');
                break;
            case 'stat' :
                /* ezt a háttérben kéne kigyűjteni :) */
                var friends_params = {};
                friends_params[opensocial.DataRequest.PeopleRequestFields.MAX] = 20;
                //név szerint rendezve
                friends_params[opensocial.DataRequest.PeopleRequestFields.SORT_ORDER] = opensocial.DataRequest.SortOrder.NAME;
                //csak azokat, akiknek telepítve van az alkalmazás
                friends_params[opensocial.DataRequest.PeopleRequestFields.FILTER] =	opensocial.DataRequest.FilterType.HAS_APP;
                var ownerFriends = opensocial.newIdSpec({ "userId" : "OWNER", "groupId" : "FRIENDS" });
                //ismerősök, es a hozzájuk tartozó alkalmazás-adatok
                req.add(req.newFetchPeopleRequest(ownerFriends, friends_params), 'ownerFriends');
                req.add(req.newFetchPersonAppDataRequest(ownerFriends, 'fozelek', friends_params), 'ownerFriendsData');
                break;
            default:
                break;
        }


        log('OnInit: Elküldöm a requestData-kérést',method);
        req.send(callbackfunction);
    }
//}}}
//{{{ Loggolás a fejlesztéshez

    var log = function( variable, val) {
            if(!DEBUG) return;
            var value_part = '';
            if( val != 'undefined' ) value_part = ' : "' + val + '"';
            $('log').innerHTML = $('log').innerHTML + variable + value_part + CRLF;
        }

    var info = function( msg ) {
            log( msg, 'undefined');
        }
//}}}
//{{{ Start
    return {
        init: function() {
           info('init.');
           $('igen').observe('click', igen);
           $('nem').observe('click', nem);
           requestData('init',load);
        }
    }
//}}}
}();

