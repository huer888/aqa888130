#!/bin/bash
# Helper script to find outgoing IP
echo "Checking outgoing IP..."
IP=$(curl -s https://ifconfig.me)
echo "Your Server Public IP is: $IP"
echo "Please add this IP to your VQPay Merchant Whitelist."
