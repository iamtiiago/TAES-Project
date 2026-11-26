Feature: US15 - Gerir lista de compras

  Background:
    Given que abri a aplicação com um perfil de teste para a lista de compras

  Scenario: Adicionar ingredientes em falta a partir de uma receita
    When adiciono à lista os ingredientes em falta do arroz de frango
    And abro a lista de compras no dashboard
    Then vejo "Frango" na lista com quantidade "300 g"

  Scenario: Marcar um produto como comprado
    When abro a lista de compras no dashboard
    And adiciono "Produto de teste US15" com quantidade "2" e unidade "un"
    And marco "Produto de teste US15" como comprado
    Then vejo "Produto de teste US15" na secção de comprados

  Scenario: Transferir um produto comprado para a despensa
    When abro a lista de compras no dashboard
    And adiciono "Produto de teste US15" com quantidade "2" e unidade "un"
    And marco "Produto de teste US15" como comprado
    And transfiro "Produto de teste US15" para a despensa com validade "2030-12-31"
    Then vejo a confirmação da transferência
