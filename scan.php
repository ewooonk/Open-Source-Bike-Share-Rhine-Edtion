<?php
require("config.php");
require("db.class.php");
require('actions-qrcode.php');

$db=new Database($dbserver,$dbuser,$dbpassword,$dbname);
$db->connect();

if (isset($_COOKIE["loguserid"])) $userid=$_COOKIE["loguserid"];
else $userid=0;
if (isset($_COOKIE["logsession"])) $session=$_COOKIE["logsession"];
$request=substr($_SERVER["REQUEST_URI"],strpos($_SERVER["REQUEST_URI"],".php")+5);
$request=explode("/",$request);
$action=$request[0];
if (isset($request[1])) $parameter=$request[1];
else $action=""; // mangled QR code, clear action

switch($action)
   {
   case "rent":
      logrequest($userid,$action);
      checksession();
      $bikeno=$parameter;
      checkbikeno($bikeno);
      rent($userid,$bikeno);
      break;
   default:
      unrecognizedqrcode($userid);
   }

?>