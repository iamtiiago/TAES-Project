Feature: US07 - Atualizar e remover alimentos

  Background:
    Given que abri a despensa num navegador de teste
    And guardo o alimento "Arroz" em "Despensa" com "1" "kg" e validade "2099-12-31"
    And vejo a confirmação de gravação

  Scenario: Atualizar todos os dados de um alimento e conservar as alterações
    When abro a edição do primeiro alimento
    And guardo o alimento "Ervilhas" em "Congelador" com "600" "g" e validade "2099-10-15"
    Then vejo a confirmação "Alimento atualizado com sucesso." na despensa
    When reabro a aplicação e volto à despensa
    Then vejo "Ervilhas" na lista com categoria "Congelador", quantidade "600 g" e validade "15/10/2099"
    And só há um alimento guardado

  Scenario: Cancelar a edição preserva os dados originais
    When abro a edição do primeiro alimento
    And altero o nome em edição para "Ervilhas" e cancelo
    Then vejo "Arroz" na lista com categoria "Despensa", quantidade "1 kg" e validade "31/12/2099"

  Scenario: Cancelar a remoção mantém o alimento na despensa
    When peço para remover o primeiro alimento
    And cancelo a remoção
    Then vejo "Arroz" na lista com categoria "Despensa", quantidade "1 kg" e validade "31/12/2099"

  Scenario: Remover apenas o registo escolhido quando existem nomes iguais
    Given guardo o alimento "Arroz" em "Despensa" com "2" "kg" e validade "2099-12-30"
    And vejo a confirmação de gravação
    When peço para remover o primeiro alimento
    And confirmo a remoção
    Then vejo a confirmação "Alimento removido com sucesso." na despensa
    When reabro a aplicação e volto à despensa
    Then vejo "Arroz" na lista com categoria "Despensa", quantidade "2 kg" e validade "30/12/2099"
    And só há um alimento guardado
