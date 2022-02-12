# `IT 🇮🇹`
Questo script vi permette di ottenere una lista aggiornata di CAP, comuni, province e regioni italiane (anche collegate fra loro): il programma prende inizialmente i dati dalla [lista dei comuni italiani ISTAT](https://www.istat.it/storage/codici-unita-amministrative/Elenco-comuni-italiani.xls) (convertita in formato XLSX) e abbina i comuni ai rispettivi CAP (anche multipli) effettuando ricerche sul sito [comuniecitta.it](https://www.comuniecitta.it).

Alcuni CAP mancano sul sito o il nominativo del comune non corrisponde a quello riportato nella lista ISTAT, quindi esiste il file `special.json` che va a compensare questi problemi, anche se va popolato manualmente e quindi al momento contiene solo un paio di elementi.

Potete scegliere se compilare la lista sul vostro computer (clonando la repository e facendo partire lo script) oppure scaricare direttamente il file `out.json` da questa repository. L'output è aggiornato al 12/02/2022 (gg/mm/aaaa).

# `EN 🇬🇧`
This script allows you to get an updated list of Italian zip codes, municipalities, provinces and regions (linked to each other as well): the program initially grabs data from the [ISTAT's Italian municipalities list](https://www.istat.it/storage/codici-unita-amministrative/Elenco-comuni-italiani.xls) (converted into XLSX format) and links each municipality to its own zip code(s) by searching on the website [comuniecitta.it](https://www.comuniecitta.it).

Some zip codes are missing or the name of the municipality is not strictly the same as the one on the ISTAT's list, so there is the `special.json` file which aims at adding the missing zip codes to the final output. The data in it has to be added manually, so as of now it only contains a couple of elements.

You can either choose to compile the list on your own computer (by cloning the repository and starting the script) or to immediately download the file `out.json` from here. The output is updated as of 12/02/2022 (dd/mm/yyyy).