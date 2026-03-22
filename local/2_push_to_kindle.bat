@echo off
echo transferring to Kindle...

pscp -pw "<YOUR_KINDLE_PASSWORD>" -scp .\Output\latest.jpg root@<YOUR_KINDLE_IP>:/tmp/latest.jpg

echo transferred. refreshing...

plink -pw "<YOUR_KINDLE_PASSWORD>" -batch root@<YOUR_KINDLE_IP> "/usr/sbin/eips -c; /usr/sbin/eips -g /tmp/latest.jpg"

echo successed!