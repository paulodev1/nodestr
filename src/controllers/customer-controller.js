'use strict';

const ValidationContract = require('../validators/fluent-validator');
const repository = require('../repositories/customer-repository');
const md5 = require('md5');
const authService = require('../services/auth-service');

const emailService = require('../services/email-service');

exports.post = async (req, res, next) => {
    let contract = new ValidationContract();
    contract.hasMinLen(req.body.name, 3, 'O Nome deve conter pelo menos 3 caracteres');
    contract.isEmail(req.body.email,'E-mail inválido');
    contract.hasMinLen(req.body.password, 6, 'A senha deve conter pelo menos 6 caracteres');


    // se os dados forem invalidos
    if (!contract.isValid()) {
        res.status(400).send(contract.errors()).end();
        return;
    }

    try {
        await repository.create({
            name: req.body.name,
            email: req.body.email,
            password: md5(req.body.password + global.SALT_KEY),
            // password: (req.body.password )
            roles:["user"]
        });

        emailService.send(req.body.email, 'Bem vindo ao Node Store', global.EMAIL_TMPL.replace('{0}', req.body.name))

        res.status(201).send({
            message: 'Cliente cadastro com sucesso!'
        });
    } catch (e) {
        res.status(500).send({
            message: 'Falha ao processar sua requisicao'
        });
    }

};


exports.authenticate = async (req, res, next) => {

    try {
      const customer = await repository.authenticate({
            email: req.body.email,
            password: md5(req.body.password + global.SALT_KEY)
          //password: (req.body.password )
        });

        if (!customer) {
            res.status(404).send({
                message : 'Usuario ou senha invalidos.'
            });
            return;    
}


        const token = await authService.generateToken({
             id: customer._id,
            email: customer.email,
            name: customer.name,
            roles: customer.roles
        });

        res.status(201).send({
            token: token,
            data: {
                email: customer.email,
                name: customer.name
            }
        });
    
    } catch (e) {
        res.status(500).send({
            message: 'Falha ao processar sua requisicao'
        });
    }

};


exports.refreshToken = async (req, res, next) => {

    try {
        // Recupera o token
        const token = req.body.token || req.query.token || req.headers['x-access-token'];
        // Decodifica o token
        const data = await authService.decodeToken(token);

        const customer = await repository.getById(data.id);

        if (!customer) {
            res.status(404).send({
                message: 'Cliente nao encontrado.'
            });
            return;
        }


        const tokenData = await authService.generateToken({
            id: customer._id,
            email: customer.email,
            name: customer.name,
            roles: customer.roles
        });

        res.status(201).send({
            token: token,
            data: {
                email: customer.email,
                name: customer.name
            }
        });

    } catch (e) {
        res.status(500).send({
            message: 'Falha ao processar sua requisicao'
        });
    }

};