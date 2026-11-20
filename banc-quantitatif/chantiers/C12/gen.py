import json
def F(nom,q,u,ouv,emp,don,ap=None,prec=""):
    return {"nom":nom,"quantite":q,"unite":u,"ouvrage":ouv,"emplacement":emp,"donnees":[{"cle":k,"valeur":v} for k,v in don],"attend":[],"a_preciser":ap or [],"precision":prec}
def L(ref,des,q,u,role,fs): return {"ref":ref,"designation":des,"quantite":q,"unite":u,"role":role,"fournitures":fs}
def D(d,v,o="lue",r="",p=""): return {"donnee":d,"valeur":v,"origine":o,"regle":r,"preuve":p}
T="couverture-tuiles-emboitement"
lec={"metier":"roofing","lots":[],
"fiche":[
 D("ouvrage","réfection de couverture en tuiles à emboîtement, rénovation",p="objet : « Réfection couverture tuiles » ; ligne 2 : « Dépose ancienne couverture »"),
 D("tuile","HP10 ardoisé",p="ligne 5 : « tuiles terre cuite HP10 ardoisé »"),
 D("surface","95 m²",p="lignes 2 à 5 : « 95 m2 »"),
 D("pente","35°",p="ligne 5 : « pente 35° »"),
 D("rampant","6 m",p="ligne 5 : « rampant 6 m »"),
 D("écran sous-toiture","95 m²",p="ligne 3 : « écran sous-toiture », 95 m2"),
 D("liteaux","95 m² de lattage",p="ligne 4 : « liteaux », 95 m2"),
 D("longueur de rives","12 m","deduite","2 rives × 6 m = 12 m","ligne 6 : « 2 rives de 6 m »"),
 D("faîtage","à sec, 9 ml",p="ligne 7 : « Faîtage à sec », 9 ml"),
 D("fenêtres de toit","2 Velux GGL SK06 114x118 et 1 Velux GGL CK02 55x78, soit 3","deduite","2 + 1 = 3","lignes 8 et 9"),
 D("raccord des fenêtres de toit","pour tuiles",p="lignes 8 et 9 : « raccord tuiles »"),
 D("sortie de toit","1 sortie Ø125 pour VMC",p="ligne 10 : « Sortie de toit Ø125 pour VMC », 1 u"),
 D("bavette plomb","4 ml, largeur 30 cm, sous fenêtres",p="ligne 11 : « plomb larg. 30 sous fenêtres de toit, 4 ml en tout »"),
 D("pureau","","manquante"),
 D("épaisseur du plomb","","manquante"),
],
"bref":[
 "Réfection d'une couverture en tuiles, en rénovation : l'ancienne couverture est déposée.",
 "95 m² d'écran sous-toiture.",
 "95 m² de liteaux.",
 "95 m² de tuiles terre cuite HP10 ardoisé, pente 35°, rampant 6 m.",
 "Tuiles de rive HP10 ardoisé : 2 rives de 6 m, soit 12 m.",
 "Faîtage à sec de 9 ml.",
 "2 fenêtres de toit Velux GGL SK06 114x118 avec raccord tuiles.",
 "1 fenêtre de toit Velux GGL CK02 55x78 avec raccord tuiles.",
 "1 sortie de toit Ø125 pour VMC.",
 "4 ml de bavette plomb largeur 30 sous les fenêtres de toit.",
 "Échafaudage, dépose et nettoyage : rien à acheter.",
],
"questions":[],
"lignes":[
 L("1","Echafaudage de pied + protections, montage, location et repli","1","forfait","hors_quantitatif",[]),
 L("2","Dépose ancienne couverture ardoises fibro + liteaux, descente et évacuation en déchetterie","95","m2","hors_quantitatif",[]),
 L("3","F et P écran sous-toiture","95","m2","fourniture_et_pose",[F("Écran sous-toiture","95","m2",T,"ecran",[("surface","95")],["type d'écran"])]),
 L("4","F et P liteaux","95","m2","fourniture_et_pose",[F("Liteaux","","",T,"liteau",[("surface","95")],["section"])]),
 L("5","F et P couverture tuiles terre cuite HP10 ardoisé, pente 35°, rampant 6 m","95","m2","fourniture_et_pose",[F("Tuiles terre cuite HP10 ardoisé","95","m2",T,"tuile",[("surface","95"),("pente","35"),("longueur_rampant","6")])]),
 L("6","F et P tuiles de rive HP10 ardoisé, 2 rives de 6 m","1","ens","fourniture_et_pose",[F("Tuiles de rive HP10 ardoisé","12","ml",T,"rive",[("longueur_rives","12")],["rives gauches et droites"],"2 rives de 6 m")]),
 L("7","Faîtage à sec","9","ml","fourniture_et_pose",[F("Faîtières","9","ml","faitage","faitiere",[("longueur_faitage","9")],["modèle de faîtière","teinte"],"faîtage à sec")]),
 L("8","F et P fenêtre de toit Velux GGL SK06 114x118 avec raccord tuiles","2","u","fourniture_et_pose",[
   F("Velux GGL SK06 114x118","2","u","fenetre-de-toit","fenetre",[("nb_fenetres","2"),("raccord_couverture","1"),("taille_fenetre","114x118")],["finition"]),
   F("Raccord tuiles pour Velux GGL SK06 114x118","2","u","fenetre-de-toit","raccord",[("nb_fenetres","2"),("raccord_couverture","1"),("taille_fenetre","114x118")])]),
 L("9","F et P fenêtre de toit Velux GGL CK02 55x78 avec raccord tuiles","1","u","fourniture_et_pose",[
   F("Velux GGL CK02 55x78","1","u","fenetre-de-toit","fenetre",[("nb_fenetres","1"),("raccord_couverture","1"),("taille_fenetre","55x78")],["finition"]),
   F("Raccord tuiles pour Velux GGL CK02 55x78","1","u","fenetre-de-toit","raccord",[("nb_fenetres","1"),("raccord_couverture","1"),("taille_fenetre","55x78")])]),
 L("10","Sortie de toit Ø125 pour VMC, fournie et posée","1","u","fourniture_et_pose",[F("Sortie de toit Ø125 pour VMC","1","u","sortie-de-toit","sortie",[("nb_sorties","1"),("diametre_sortie","125"),("usage_sortie","2"),("support_sortie","1")],["teinte"])]),
 L("11","Bavette plomb larg. 30 sous fenêtres de toit, 4 ml en tout, fournie et posée","1","ens","fourniture_et_pose",[F("Bavette plomb largeur 30","4","ml","bandes-plomb","plomb",[("longueur_plomb","4"),("largeur_plomb","30")],[],"sous fenêtres de toit")]),
 L("12","Nettoyage du chantier et repli","1","forfait","hors_quantitatif",[]),
],
"contexte":[{"cle":k,"valeur":v} for k,v in [("entreprise","Couverture Le Bihan"),("client","M. et Mme Riou"),("adresse","23 rue de Kergoat ar Lez"),("ville","Quimper"),("code postal","29000"),("numéro du devis","2026-214"),("date","09/11/2026"),("objet","Réfection couverture tuiles"),("neuf ou rénovation","rénovation")]],
"notes":[]}
json.dump(lec,open("lecture-or.json","w"),ensure_ascii=False,indent=1)
